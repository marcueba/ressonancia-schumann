// The experimental index has no validated numerical implementation.
export function getERIState() {
  return {
    enabled: false as const,
    status: 'Em desenvolvimento' as const,
    experimental: true as const,
  };
}
