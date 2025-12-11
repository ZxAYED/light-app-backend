# Shalana07 Backend API Documentation

Welcome! This document describes all available APIs, their request/response formats, auth requirements, and the core server-side logic behind each route. Use it as a single reference to integrate the frontend.

## Conventions
- Base URL: `{{base-url}}`
- Auth header: `Authorization:  <ACCESS_TOKEN>`
- Roles: `PARENT`, `CHILD`, `ADMIN` (enforced via role validation middleware)
- All responses use a common envelope: `{ statusCode, success, message, data }`

---

## Authentication

- POST `{{base-url}}/auth/create-parent`
  - Validates payload, creates parent user, sends email OTP.
- POST `{{base-url}}/auth/create-admin`
  - Creates admin user.
- POST `{{base-url}}/auth/create-child` [role: PARENT]
  - Accepts form-data, creates child profile.
- POST `{{base-url}}/auth/login`
  - Returns access and refresh tokens; embed role and profile.
- POST `{{base-url}}/auth/refresh-token` [roles: PARENT/CHILD/ADMIN]
  - Issues a fresh access token.
- POST `{{base-url}}/auth/resend-otp` / `verify-otp`
  - Email OTP lifecycle.
- Password: `reset-password`, `request-reset-password`, `change-password` (schema validated).
- GET `{{base-url}}/auth/get-profile` [roles: all]
  - Returns the authenticated user profile.
- GET `{{base-url}}/auth/get-all-child` [role: PARENT]
- GET `{{base-url}}/auth/get-all-siblings` [role: CHILD]
- DELETE `{{base-url}}/auth/delete-child/:childId` [role: PARENT]
- PATCH `{{base-url}}/auth/delete-parent` [role: PARENT]

---

## Goals

- POST `{{base-url}}/goals/create-goal` [roles: PARENT/CHILD]
  - Validates schema and creates a goal.
- PATCH `{{base-url}}/goals/update-goal/:goalId` [roles: PARENT/CHILD]
  - Updates title/dates/reward, etc.
- GET `{{base-url}}/goals/parent-goals` [role: PARENT]
- GET `{{base-url}}/goals/child-goals` [role: CHILD]
- PATCH `{{base-url}}/goals/update-progress/:goalId` [role: CHILD]
  - Logs minutes & percent; updates global progress; issues reward coins when completed.

---

## Avatar: Admin

- POST `{{base-url}}/avatar/` [role: ADMIN]
  - Create avatar with `gender`, `region`, `price`, etc.
- POST `{{base-url}}/avatar/style` [role: ADMIN]
  - Create an `AssetStyle` under an `AvatarCategory` type for a specific avatar.
- POST `{{base-url}}/avatar/create-asset` [role: ADMIN]
  - Create assets (colors) under a style; supports gender/price/rarity.
- DELETE `{{base-url}}/avatar/:avatarId` [role: ADMIN]
- DELETE `{{base-url}}/avatar/category/:categoryId` [role: ADMIN]
- DELETE `{{base-url}}/avatar/style/:styleId` [role: ADMIN]
- DELETE `{{base-url}}/avatar/asset/:assetId` [role: ADMIN]

---

## Avatar: Child

### Owned vs Available
- GET `{{base-url}}/avatar/owned` [role: CHILD]
  - Returns `{ equipped, unequipped }`:
    - `equipped`: the active avatar
    - `unequipped`: other owned avatars
- GET `{{base-url}}/avatar/available?gender=MALE&region=Europe` [role: CHILD]
  - Returns avatars the child does NOT own yet (excludes owned by `notIn`).
  - Supports `origin=` alias for `region` and case-insensitive matching.

### Assets
- GET `{{base-url}}/avatar/assets/style/:styleId` [role: CHILD]
  - List assets for a style.
- GET `{{base-url}}/avatar/assets/category/:type` [role: CHILD]
  - If `type=TRENDING` (or `POPULAR`), returns global top-10 assets by `purchased` desc (ties by `createdAt` desc).
  - Otherwise returns assets for the specific category type (`HAIR`, `DRESS`, `EYES`, etc.).
- GET `{{base-url}}/avatar/asset/:assetId` [role: CHILD]
  - Returns asset details including its style and parent category.

### Purchase & Unlock
- POST `{{base-url}}/avatar/purchase/:avatarId` [role: CHILD]
  - Validates coins, prevents double-ownership, creates `ChildAvatar` ownership (inactive by default).
- POST `{{base-url}}/avatar/unlock-asset` [role: CHILD]
  - Body: `{ assetIds: string[] }`
  - Validates:
    - Assets exist.
    - Each asset’s parent avatar is owned by the child; otherwise returns a precise mapping: `You Dont Own this Avatar(s): <avatarId> (asset:<assetId>),...`.
  - Creates `ChildAsset` records; skips duplicates.

### Customization
- GET `{{base-url}}/avatar/customization/:avatarId` [role: CHILD]
  - Ownership gate: child must own this avatar.
  - Returns full avatar customization JSON:
    - Top fields: `avatarImgUrl`, `gender`, `region`
    - Category keys: `hair`, `dress`, `jewelry`, `shoes`, `eyes`, `nose`, `skin`, `accessory`, `pet`
    - For each style’s `colors` item:
      - `id` (asset id)
      - `url` (asset image)
      - `isUnlocked`: true if child owns the asset (or it’s a starter)
      - `isLocked`: inverse of `isUnlocked`
      - `isSelected`: true if currently equipped
      - `price`
  - This endpoint always returns the full catalog for the avatar with correct flags; frontend does not need to pass filters.

- POST `{{base-url}}/avatar/customization/:avatarId` [role: CHILD]
  - Body: `{ "assetIds": ["<asset-id>", ...] }`
  - Validations:
    - Child owns `:avatarId`.
    - All `assetIds` belong to this avatar.
    - All `assetIds` are unlocked by the child.
  - Behavior:
    - Replaces currently equipped items with the provided list.
    - Sets this avatar `isActive=true`, others `isActive=false` for the child.
  - Response:
    - `savedCount`: number of equipped assets saved.
    - `unlockedAssetIds`: full list of assets the child owns (inventory snapshot).

---

## Logic Highlights (Server-Side)

- Owned/Available split:
  - `available` excludes owned avatars via `id: { notIn: ownedIds }`.
  - `owned` groups into `equipped` (active) and `unequipped` (inactive) for menu UI.
- Customization flags:
  - `isUnlocked` derives from `ChildAsset` ownership or `isStarter` asset.
  - `isSelected` derives from `ChildAvatarEquipped` for the specific avatar.
- Strict validation before equip:
  - Belongs-to-avatar check ensures `assetIds` are not cross-avatar.
  - Unlock-enforcement prevents equipping locked assets.
- Trend logic:
  - Global trending is accessed by `type=TRENDING` in category route; returns top-10 purchased across all categories.

---

## Typical Frontend Flow

1) Show child’s avatars: `GET /avatar/owned`
2) Customize current avatar: `GET /avatar/customization/:avatarId`
3) Unlock any desired assets: `POST /avatar/unlock-asset`
4) Save preset: `POST /avatar/customization/:avatarId` with selected unlocked `assetIds`
5) Verify selection: re-fetch `GET /avatar/customization/:avatarId` (look for `isSelected: true`)

---

## Error Messages (Excerpts)
- `Avatar not owned by child` – Accessing customization for an avatar not owned.
- `One or more assets do not belong to this avatar` – Cross-avatar asset IDs in save.
- `Locked assetIds: <ids>` – Trying to equip assets not unlocked.
- `You Dont Own this Avatar(s): <avatarId> (asset:<assetId>)` – Unlock attempt where parent avatar is missing.
- Common 401/403/404 responses apply across routes.

---

## Postman Tips
- Set `{{base-url}}` and `{{childToken}}` / `{{parentToken}}` variables.
- Use `GET /avatar/customization/:avatarId` to pick `assetIds` from `colors[].id`.
- Use `POST /avatar/unlock-asset` before save if any target asset has `isLocked: true`.

---

## Versioning & Notes
- Schema indexes exist for avatar `gender` and `region`.
- Assets link to styles; styles link to categories; categories link to avatars.
- Role validation is enforced across all routes.

---

## Table of Contents
- [Authentication](#authentication)
- [Goals](#goals)
- [Avatar: Child](#avatar-child)
- [Avatar: Admin](#avatar-admin)
- [Endpoint Summary](#endpoint-summary)
- [Request/Response Examples](#requestresponse-examples)
- [Validation & Business Rules](#validation--business-rules)

---

## Endpoint Summary

### Authentication
| Method | Path | Role | Notes |
|-------|------|------|------|
| POST | `/auth/create-parent` | Public | Creates parent and sends OTP |
| POST | `/auth/create-admin` | Public | Creates admin |
| POST | `/auth/create-child` | PARENT | Form-data, creates child |
| POST | `/auth/login` | Public | Returns tokens |
| POST | `/auth/refresh-token` | ALL | New access token |
| POST | `/auth/resend-otp` | Public | Resend OTP |
| POST | `/auth/verify-otp` | Public | Verify OTP |
| POST | `/auth/reset-password` | Public | Reset password |
| POST | `/auth/request-reset-password` | Public | Request reset |
| POST | `/auth/change-password` | ALL | Change password |
| GET | `/auth/get-profile` | ALL | Current user profile |
| GET | `/auth/get-all-child` | PARENT | List children |
| GET | `/auth/get-all-siblings` | CHILD | List siblings |
| DELETE | `/auth/delete-child/:childId` | PARENT | Remove child |
| PATCH | `/auth/delete-parent` | PARENT | Remove parent |

### Goals
| Method | Path | Role | Notes |
|-------|------|------|------|
| POST | `/goals/create-goal` | PARENT/CHILD | Create goal |
| PATCH | `/goals/update-goal/:goalId` | PARENT/CHILD | Update goal |
| GET | `/goals/parent-goals` | PARENT | List goals |
| GET | `/goals/child-goals` | CHILD | List goals |
| PATCH | `/goals/update-progress/:goalId` | CHILD | Log minutes & percent |

### Avatar: Child
| Method | Path | Role | Notes |
|-------|------|------|------|
| GET | `/avatar/owned` | CHILD | `{ equipped, unequipped }` |
| GET | `/avatar/available` | CHILD | Excludes owned; supports `gender`, `region` or `origin` |
| GET | `/avatar/assets/style/:styleId` | CHILD | Assets for style |
| GET | `/avatar/assets/category/:type` | CHILD | `TRENDING` = global top-10 |
| GET | `/avatar/asset/:assetId` | CHILD | Asset details |
| GET | `/avatar/customization/:avatarId` | CHILD | Full catalog with flags |
| POST | `/avatar/customization/:avatarId` | CHILD | Save preset (equip) |
| POST | `/avatar/purchase/:avatarId` | CHILD | Buy avatar |
| POST | `/avatar/unlock-asset` | CHILD | Unlock assets |

### Avatar: Admin
| Method | Path | Role | Notes |
|-------|------|------|------|
| POST | `/avatar/` | ADMIN | Create avatar |
| POST | `/avatar/style` | ADMIN | Create style under category |
| POST | `/avatar/create-asset` | ADMIN | Create asset |
| DELETE | `/avatar/:avatarId` | ADMIN | Delete avatar |
| DELETE | `/avatar/category/:categoryId` | ADMIN | Delete category |
| DELETE | `/avatar/style/:styleId` | ADMIN | Delete style |
| DELETE | `/avatar/asset/:assetId` | ADMIN | Delete asset |

---

## Request/Response Examples

### Get Customization
Request:
```
GET {{base-url}}/avatar/customization/{{avatarId}}
Authorization:  {{childToken}}
```
Response (excerpt):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Customization data fetched successfully",
  "data": {
    "avatarImgUrl": "https://.../avatar.png",
    "gender": "FEMALE",
    "region": "International",
    "hair": {
      "name": "Hair",
      "elements": [
        {
          "id": "7be6f6f0-bce7-4775-8196-b96e42ac3b5d",
          "styleName": "Long",
          "colors": [
            {
              "id": "906248d1-47df-49dc-b0ea-b74763738293",
              "url": "https://example.com/assets/hair/long/1.png",
              "isUnlocked": true,
              "isLocked": false,
              "isSelected": false,
              "price": 0
            }
          ]
        }
      ]
    }
  }
}
```

### Save Customization (Equip)
Request:
```
POST {{base-url}}/avatar/customization/{{avatarId}}
Authorization:  {{childToken}}
Content-Type: application/json
```
Body:
```json
{
  "assetIds": [
    "906248d1-47df-49dc-b0ea-b74763738293",
    "aaa0f49a-d410-4ff3-a847-37e58d0c23b1"
  ]
}
```
Response:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Customization saved successfully",
  "data": {
    "savedCount": 2,
    "unlockedAssetIds": [
      "906248d1-47df-49dc-b0ea-b74763738293",
      "628e67cb-5bf3-456b-9c96-1fed046a397c",
      "f65a99e2-be07-4b4a-b97c-4545c16be6dd",
      "aaa0f49a-d410-4ff3-a847-37e58d0c23b1"
    ]
  }
}
```

### Unlock Assets
Request:
```
POST {{base-url}}/avatar/unlock-asset
Authorization:  {{childToken}}
Content-Type: application/json
```
Body:
```json
{
  "assetIds": [
    "805502c8-ed62-41f2-8b93-fb867760f4d5",
    "fd4a06e5-c2f4-4c7a-aa42-39948ad7648"
  ]
}
```
Possible error:
```json
{
  "statusCode": 400,
  "success": false,
  "message": "You Dont Own this Avatar(s): e2a67... (asset:805502c8-...)"
}
```

### Owned Avatars
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Owned avatars fetched successfully",
  "data": {
    "equipped": { "id": "avatar-1", "gender": "FEMALE", "region": "Europe" },
    "unequipped": [ { "id": "avatar-2" }, { "id": "avatar-3" } ]
  }
}
```

---

## Validation & Business Rules
- Child must own `:avatarId` to access customization or save.
- Save requires all `assetIds` belong to the avatar and are unlocked.
- Unlock requires the child own the asset’s parent avatar.
- Available avatars exclude those already owned by the child.
- Category `TRENDING` returns global top-10 assets by purchase count.