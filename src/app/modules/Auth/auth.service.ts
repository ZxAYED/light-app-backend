import bcrypt from "bcrypt";
import status from "http-status";
import { Secret } from "jsonwebtoken";
import config from "../../../config";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import prisma from "../../../shared/prisma";
import AppError from "../../Errors/AppError";


import { UserRole } from "@prisma/client";
import { sendOtpEmail } from "../../../utils/sendOtpEmail";
import { sendPasswordResetOtp } from "../../../utils/sendResetPasswordOtp";
import { CreateChildInput, CreateUserInput } from "./auth.validation";

const createUser = async (payload: CreateUserInput) => {

  // Step 1: Check if user already exists
  const isUserExist = await prisma.user.findFirst({
    where: { email: payload.email },
  });

  if (isUserExist) {
    throw new AppError(status.CONFLICT, "User Already Exist");
  }

  // Step 2: Hash password
  const hashedPassword = await bcrypt.hash(payload.password as string, 12);

  // Step 3: Generate OTP (5 digits) & expiry (e.g., 5 minutes)
  const otp = Math.floor(10000 + Math.random() * 90000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);


  const transaction = await prisma.$transaction(async (tx) => {
    const res = await tx.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
        role: "PARENT",
        otp,
        otp_expires_at: otpExpiresAt,
        is_verified: false,
      },
      select: {
        id: true,
        email: true,
        is_verified: true,
      },
    });


    const result = await tx.parentProfile.create({
      data: {
        userId: res.id,
        name: payload.name,
        phone: payload.phone
      }
    });
    await sendOtpEmail(payload.email, otp);


    return { ...res, ...result };
  })

  return transaction;
};


const resendOtp = async (email: string) => {
  // Step 1: Find user by email
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.is_verified) {
    throw new AppError(status.BAD_REQUEST, "User already verified");
  }

  // Step 2: Generate new OTP and expiry
  const otp = Math.floor(10000 + Math.random() * 90000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  // Step 3: Update user record with new OTP
  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otp_expires_at: otpExpiresAt,
    },
  });



  // Step 4: Send OTP email
  await sendOtpEmail(email, otp);

  return { message: "OTP resent successfully" };
};

const verifyOtp = async (email: string, otp: string) => {
  // Step 1: Find user by email
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.is_verified) {
    throw new AppError(status.BAD_REQUEST, "User already verified");
  }

  // Step 2: Check OTP match
  if (user.otp !== otp) {
    throw new AppError(status.UNAUTHORIZED, "Invalid OTP");
  }

  // Step 3: Check OTP expiry
  if (user.otp_expires_at && user.otp_expires_at < new Date()) {
    throw new AppError(status.UNAUTHORIZED, "OTP has expired");
  }

  // Step 4: Mark user as verified and clear OTP
  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      is_verified: true,
      otp: null,
      otp_expires_at: null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      is_verified: true,
    },
  });

  return updatedUser;
};

const loginUser = async (payload: { email: string; password: string }) => {
  // Step 1: Find user by email
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // Step 2: Check if user is verified
  if (!user.is_verified) {
    throw new AppError(
      status.UNAUTHORIZED,
      "User not verified. Please verify your email/OTP."
    );
  }

  // Step 3: Verify password
  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    user.password
  );
  if (!isCorrectPassword) {
    throw new AppError(status.UNAUTHORIZED, "Incorrect password");
  }

  let profile
  if (user.role === UserRole.PARENT) {
    profile = await prisma.parentProfile.findFirst({
      where: { userId: user.id },
      include: {
        children: {
          where: {
            isDeleted: false,
          }
        }
      }
     
    })
  }
  else if (user.role === UserRole.CHILD) {
    profile = await prisma.childProfile.findFirst({
      where: { userId: user.id },
     
    });
  }
  else {
    profile = user
  }

  // Step 4: Generate access & refresh tokens
  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      profile,
      role: user.role,
    },
    config.jwt.access_token_secret as Secret,
    config.jwt.access_token_expires_in as string
  );

  const refreshToken = jwtHelpers.generateToken(
    { email: user.email },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in as string
  );

  // Step 5: Return user info + tokens (exclude password)
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile,
    },
    accessToken,
    refreshToken,
  };
};

const refreshAccessToken = async (token: string) => {
  try {
    // validate refresh token
    const decoded = jwtHelpers.verifyToken(
      token,
      config.jwt.refresh_token_secret as Secret
    );

    const { email } = decoded;

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new AppError(status.NOT_FOUND, "User not found");
    }
    let profile
    if (user.role === UserRole.PARENT) {
      profile = await prisma.parentProfile.findFirst({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          phone: true,
          relation: true,
          image: true,
          dateOfBirth: true,
          location: true,
        }
      })
    }
    else if (user.role === UserRole.CHILD) {
      profile = await prisma.childProfile.findFirst({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          phone: true,
          relation: true,
          coins: true,
          image: true,
          location: true,
          dateOfBirth: true,
          gender: true,
        }
      });
    }
    else {
      profile = user
    }

    // Step 4: Generate access & refresh tokens
    const accessToken = jwtHelpers.generateToken(
      {
        id: user.id,
        email: user.email,
        profile,
        role: user.role,
      },
      config.jwt.access_token_secret as Secret,
      config.jwt.access_token_expires_in as string
    );



    return {
      accessToken,
    };
  } catch (err) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }
};

interface ChangePasswordPayload {
  id: string;
  oldPassword: string;
  newPassword: string;
}

const changePassword = async (payload: ChangePasswordPayload) => {
  const { id, oldPassword, newPassword } = payload;

  // Step 1: Find user by id
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // Step 2: Verify old password
  const isCorrectPassword = await bcrypt.compare(oldPassword, user.password);
  if (!isCorrectPassword) {
    throw new AppError(status.UNAUTHORIZED, "Old password is incorrect");
  }

  // Step 3: Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Step 4: Update password in database
  await prisma.user.update({
    where: { id },
    data: { password: hashedNewPassword },
  });

  return { message: "Password changed successfully" };
};


const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(status.NOT_FOUND, "User not found");

  // Generate 5-digit OTP
  const otp = Math.floor(10000 + Math.random() * 90000).toString();

  // Set expiry 5 minutes from now
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Update user with OTP
  await prisma.user.update({
    where: { email },
    data: {
      password_reset_otp: otp,
      password_reset_expires: otpExpiresAt,
    },
  });

  // Send OTP to user email
  await sendPasswordResetOtp(email, otp);

  return { message: "Password reset OTP sent to your email" };
};


interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

const resetPassword = async (payload: ResetPasswordPayload & { opt?: string }) => {
  const { email, otp, newPassword, opt } = payload;
  const otpCode = otp || opt; // use otp if present, otherwise opt

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(status.NOT_FOUND, "User not found");

  if (!user.password_reset_otp || user.password_reset_otp !== otpCode) {
    throw new AppError(status.UNAUTHORIZED, "Invalid OTP");
  }

  if (!user.password_reset_expires || user.password_reset_expires < new Date()) {
    throw new AppError(status.UNAUTHORIZED, "OTP has expired");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      password_reset_otp: null,
      password_reset_expires: null,
    },
  });

  return { message: "Password has been reset successfully" };
};
const createChild = async (payload: CreateChildInput & { image?: string, imagePath?: string, userId: string }) => {
  // Step 1: Check if user already exists
  const isUserExist = await prisma.user.findFirst({
    where: { email: payload.email },
  });

  if (isUserExist) {
    throw new AppError(status.CONFLICT, "User Already Exists");
  }

  // Step 2: Hash password
  const hashPassword = await bcrypt.hash(payload.password, 12);

  // Step 3: Prepare user data
  const userData = {
    email: payload.email,
    password: hashPassword,
    role: UserRole.CHILD,
    is_verified: true, // children do not need OTP
  };
  const parent = await prisma.parentProfile.findFirst({
    where: { userId: payload.userId },
  });
  if (!parent) {
    throw new AppError(status.NOT_FOUND, "Parent not found");
  }


  const result = await prisma.$transaction(async (tx) => {
    // Step 4: Create the User entry
    const user = await tx.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Step 5: Create ChildProfile entry linked to parent
    const child = await tx.childProfile.create({
      data: {
        userId: user.id,
        parentId: parent.id,
        accountType: payload.accountType,
        name: payload.name,
        gender: payload.gender,
        phone: payload.phone,
        email: payload.email,
        dateOfBirth: payload.dateOfBirth,
        location: payload.location,
        image: payload.image,
        imagePath: payload.imagePath,

        relation: payload.relation,

        // Permissions (defaults)
        editProfile: payload.editProfile ?? true,
        createGoals: payload.createGoals ?? false,
        approveTasks: payload.approveTasks ?? false,
        deleteGoals: payload.deleteGoals ?? false,
      },

    });

    return { ...user, ...child };
  });


  return result;
};
const updateChild = async (payload: Partial<CreateChildInput> & { image?: string, imagePath?: string, childId?: string }) => {
  const { childId, ...others } = payload
  console.log("🚀 ~ updateChild ~ others:", others)
  // const data = {
  //   name: others.name,
  //   gender: others.gender,
  //   phone: others.phone,
  //   dateOfBirth: others.dateOfBirth,
  //   location: others.location,
  //   image: others.image,
  //   imagePath: others.imagePath,
  //   relation: others.relation,
  //   accountType: others.accountType
  // }
  const result = await prisma.childProfile.update({
    where: { id: childId },
    data: others,

  });
  return result;
};
const deleteChild = async (childId: string) => {

   return  prisma.$transaction(async (tx) => {
   const result = await prisma.childProfile.update({
    where: { id: childId },
    data: {
      isDeleted: true,
    }
  });
    await tx.user.update({
      where: { id: result.userId },
      data: {
        isDeleted: true,
      }
    });
})
 
};
const deleteParent = async (parentId: string) => {
  const parent = await prisma.parentProfile.findFirst({
    where: { id: parentId },
  });
  if (!parent) {
    throw new AppError(status.NOT_FOUND, "Parent not found");
  }
  return  prisma.$transaction(async (tx) => {
    await tx.parentProfile.update({
      where: { id: parentId },
      data: {
        isDeleted: true,
      }
    });
    await tx.user.update({
      where: { id: parent.userId },
      data: {
        isDeleted: true,
      }
    });
  });
};
const getAllChild = async (userId: string) => {

  const parent = await prisma.parentProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!parent) {
    throw new AppError(status.NOT_FOUND, "Parent not found");
  }


  const children = await prisma.childProfile.findMany({
    where: {
      parentId: parent.id,
      isDeleted: false
    }
  });

  return  children ;
};


const getAllSiblings = async (childUserId: string) => {

  const child = await prisma.childProfile.findUnique({
    where: { userId: childUserId },
    select: { parentId: true }
  });

  if (!child) {
    throw new AppError(404, "Child not found");
  }


  const siblings = await prisma.childProfile.findMany({
    where: {
      parentId: child.parentId,
      isDeleted: false,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      image: true,
      gender: true,
      phone: true,
      dateOfBirth: true
    }
  });

  return siblings;
};




export const UserService = {
  createUser,getAllSiblings,
  loginUser,
  resendOtp,getAllChild,
  deleteParent,
  refreshAccessToken,
  verifyOtp,
  changePassword,
  requestPasswordReset,
  resetPassword,
  createChild,
  updateChild,
  deleteChild
};
