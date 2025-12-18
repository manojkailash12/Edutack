// Allowed credit values for papers
export const ALLOWED_CREDITS = [1, 2, 3, 4, 6, 8, 12];

// Helper function to get credit options for select dropdowns
export const getCreditOptions = () => {
  return ALLOWED_CREDITS.map(credit => ({
    value: credit,
    label: credit === 1 ? '1 Credit' : `${credit} Credits`
  }));
};