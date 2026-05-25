export const getAuthenticatedUserId = async (req: Request, supabase: any): Promise<string> => {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    throw new Error('Authentication required')
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user?.id) {
    throw new Error('Invalid authentication token')
  }

  return data.user.id
}
