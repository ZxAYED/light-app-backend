import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits")
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Login validation (simple string checks)
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Change password validation (user id comes from auth middleware)
export const changePasswordSchema = z.object({
  oldPassword: z
    .string()
    .min(6, "Old password must be at least 6 characters"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Request password reset validation
export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email format"),
});
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

// Reset password validation (expects 5-digit OTP)
export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(5, "OTP must be 5 digits"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;



// Enums
export const GenderEnum = z.enum(["MALE", "FEMALE"]);
export const ChildAccountTypeEnum = z.enum(["ADMIN", "MODERATOR", "VIEWER"]);

// Main schema
export const createChildSchema = z.object({
  parentId: z.string().uuid({
    message: "Parent ID must be a valid UUID",
  }),

  email: z.string().email({
    message: "Invalid email format",
  }),

  password: z.string().min(6, {
    message: "Password must be at least 6 characters long",
  }),

  name: z.string().min(1, {
    message: "Child name is required",
  }),

  gender: GenderEnum.optional(),
  phone: z.string().optional(),
  relation: z.string().optional(),

  dateOfBirth: z.string().optional(), // frontend will send ISO string
  location: z.string().optional(),
  

  accountType: ChildAccountTypeEnum.default("MODERATOR"),

  // Permissions
  editProfile: z.boolean().default(true),
  createGoals: z.boolean().default(true),
  approveTasks: z.boolean().default(true),
  deleteGoals: z.boolean().default(false),
  unlockRewards: z.boolean().default(true),
});


export const updateChildSchema = z.object({
 
 


  name: z.string().min(1, {
    message: "Child name is required",
  }),

  gender: GenderEnum.optional(),
  phone: z.string().optional(),

  dateOfBirth: z.string().optional(), 
  location: z.string().optional(),
  


});
export type CreateChildInput = z.infer<typeof createChildSchema>;