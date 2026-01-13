# MVP Analysis: User-Psychologist Registration & Matching Flow

## Executive Summary

This document provides a deep analysis of the current MVP state, focusing on the user-psychologist registration and matching flow. The goal is to streamline the MVP to support **auto-matching only** (no manual selection) and identify what needs to be completed.

---

## Current State Analysis

### ✅ What's Working

1. **Registration Flow**
   - ✅ User onboarding wizard with role selection
   - ✅ PSM onboarding wizard
   - ✅ Smart wallet integration (ZeroDev)
   - ✅ Database registration via API endpoints
   - ✅ Profile data collection (personal info, therapeutic profile, professional info)

2. **Matching Infrastructure**
   - ✅ Auto-matching API (`/api/matching/match`) with scoring algorithm
   - ✅ Matching algorithm considers:
     - Problemática vs Especialidades (exact/partial match)
     - Geographic proximity (city/country)
     - Experience level
     - Capacity (load balancing)
   - ✅ Match data retrieval APIs for users and PSMs
   - ✅ Match history tracking

3. **Profile Display**
   - ✅ Profile page shows match information
   - ✅ Active match display for users
   - ✅ Active matches list for PSMs
   - ✅ Match history display

### ❌ What Needs Fixing

1. **Manual Selection Still Present**
   - ❌ `preferenciaAsignacion: 'explorar'` option in onboarding form
   - ❌ `/psicoterapia` page shows mock therapists (not connected to real matching)
   - ❌ Manual selection UI elements need removal

2. **Auto-Matching Not Triggered Automatically**
   - ❌ Matching is NOT triggered after user registration
   - ❌ User must manually click "Buscar Profesional" button in profile
   - ❌ No automatic matching on registration completion

3. **Profile Page Organization**
   - ⚠️ Match information is mixed with profile settings
   - ⚠️ No dedicated dashboard for match management
   - ⚠️ Match section could be more prominent

4. **Incomplete Flows**
   - ❌ No clear post-registration flow for auto-matching
   - ❌ Success page doesn't mention matching
   - ❌ No notification/feedback when match is created

---

## Detailed Flow Analysis

### Current Registration Flow

```
1. User logs in (Privy)
2. Selects role (Usuario/PSM)
3. Fills profile information
   - For users: includes `preferenciaAsignacion` (automatica/explorar) ❌
4. Reviews information
5. Creates smart wallet
6. Registers in database
7. Shows success page
8. ❌ NO AUTOMATIC MATCHING HAPPENS
```

### Current Matching Flow

```
1. User visits profile page
2. Sees "No tienes un profesional emparejado"
3. Clicks "Buscar Profesional" button
4. API call to `/api/matching/match`
5. Match is created
6. Profile page updates to show match
```

### Desired Flow (Auto-Matching Only)

```
1. User logs in (Privy)
2. Selects role (Usuario/PSM)
3. Fills profile information
   - For users: NO preference option (always automatic) ✅
4. Reviews information
5. Creates smart wallet
6. Registers in database
7. ✅ AUTOMATIC MATCHING TRIGGERED (for users only)
8. Shows success page with match information
9. User can view match in profile/dashboard
```

---

## Required Changes

### 1. Remove Manual Selection Option

**Files to modify:**
- `components/onboarding/steps/StepPerfilUsuario.tsx`
  - Remove radio buttons for `preferenciaAsignacion`
  - Set default to `'automatica'` always
  - Remove "Explorar perfiles" option

- `components/onboarding/steps/StepRevision.tsx`
  - Update display to always show "Asignación automática"
  - Remove conditional logic for `preferenciaAsignacion`

- `app/api/onboarding/user/route.ts`
  - Make `preferenciaAsignacion` optional or default to `'automatica'`
  - Remove validation for `'explorar'` option

- `lib/onboarding-store.ts`
  - Update type to only allow `'automatica'` or remove field entirely

- `prisma/schema.prisma`
  - Consider: Keep field for backward compatibility or remove it

### 2. Auto-Trigger Matching After Registration

**Files to modify:**
- `components/onboarding/steps/StepBlockchain.tsx`
  - After successful registration, trigger matching API call
  - Only for users (not PSMs)
  - Handle errors gracefully (don't block registration)

- `app/api/onboarding/user/route.ts`
  - Optionally: Trigger matching in background after registration
  - Or: Return user ID so frontend can trigger matching

**Recommended approach:**
- Trigger matching in `StepBlockchain.tsx` after registration success
- Show loading state while matching
- Display match result in success step or next step

### 3. Improve Match Display

**Options:**
- **Option A:** Keep in profile page but make it more prominent
  - Move match section to top
  - Make it a dedicated card/section
  - Add better visual hierarchy

- **Option B:** Create dedicated dashboard page
  - New route: `/dashboard` or `/mis-matches`
  - Separate from profile settings
  - More space for match details

**Recommendation:** Start with Option A (improve profile page) for MVP, can create dashboard later.

### 4. Update/Remove Psicoterapia Page

**Current state:**
- Shows mock therapist data
- Not connected to real matching system
- Has "Agendar Sesión" buttons that don't work

**Options:**
- **Option A:** Remove the page entirely (redirect to profile)
- **Option B:** Update to show matched psychologist (if user has match)
- **Option C:** Keep as informational page but remove action buttons

**Recommendation:** Option B - Show matched psychologist if available, otherwise show message to complete registration.

### 5. Update Success Page

**Files to modify:**
- `components/onboarding/steps/StepExito.tsx`
  - Show match information if match was created
  - Add message about matching process
  - Link to view match details

---

## Implementation Priority

### Phase 1: Core Auto-Matching (MVP Critical)
1. ✅ Remove manual selection option from onboarding
2. ✅ Auto-trigger matching after user registration
3. ✅ Update API to only accept `automatica`
4. ✅ Handle matching errors gracefully

### Phase 2: UX Improvements
1. ✅ Improve match display in profile page
2. ✅ Update success page to show match info
3. ✅ Add loading states for matching process
4. ✅ Update psicoterapia page or remove it

### Phase 3: Future Enhancements (Post-MVP)
1. ⏸️ Create dedicated dashboard page
2. ⏸️ Add match notifications
3. ⏸️ Add match quality score display
4. ⏸️ Add ability to request rematch

---

## Database Considerations

### Current Schema
- `PatientProfile.preferenciaAsignacion` field exists
- Can keep for backward compatibility
- New registrations will always use `'automatica'`

### Migration Strategy
- No migration needed if we keep the field
- Or: Add migration to set all existing `'explorar'` to `'automatica'`

---

## Testing Checklist

After implementing changes, test:

1. **Registration Flow**
   - [ ] User can register without seeing manual selection option
   - [ ] Registration completes successfully
   - [ ] Matching is triggered automatically
   - [ ] Match is created successfully
   - [ ] Success page shows match information

2. **Matching Flow**
   - [ ] Matching algorithm works correctly
   - [ ] Best PSM is selected based on scoring
   - [ ] Match is saved to database
   - [ ] Match appears in profile page

3. **Error Handling**
   - [ ] Registration succeeds even if matching fails
   - [ ] Error messages are user-friendly
   - [ ] User can retry matching if needed

4. **PSM Flow**
   - [ ] PSM registration doesn't trigger matching
   - [ ] PSM can see matched users in profile
   - [ ] PSM capacity is respected

---

## Questions to Answer

1. **Dashboard vs Profile:**
   - Should match information be in profile or separate dashboard?
   - **Recommendation:** Keep in profile for MVP, add dashboard later

2. **Psicoterapia Page:**
   - Remove entirely or repurpose?
   - **Recommendation:** Repurpose to show matched psychologist

3. **Matching Timing:**
   - Trigger immediately after registration or show in success page?
   - **Recommendation:** Trigger immediately, show result in success page

4. **Error Handling:**
   - What if no PSMs are available?
   - **Recommendation:** Show message, allow user to check back later

---

## Next Steps

See `TODO_MVP_COMPLETION.md` for detailed implementation tasks.












