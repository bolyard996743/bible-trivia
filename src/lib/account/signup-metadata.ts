export type SignupAgeGroup = "teen" | "adult" | "older";

/** Stored on auth.users.raw_user_meta_data so the signup trigger can create the profile. */
export function signupUserMetadata(input: {
  username: string;
  birthDate: string;
  ageGroup: SignupAgeGroup;
}): { username: string; birth_date: string; age_group: SignupAgeGroup } {
  return {
    username: input.username,
    birth_date: input.birthDate,
    age_group: input.ageGroup,
  };
}
