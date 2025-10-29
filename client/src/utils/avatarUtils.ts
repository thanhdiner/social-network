/**
 * Get initials from a Vietnamese name
 * Takes the first letter of the last word (given name)
 * Example: "Huỳnh Văn Thành" -> "T"
 */
export const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return '?'
  
  const words = name.trim().split(' ')
  if (words.length === 0) return '?'
  
  // Get the last word (given name in Vietnamese)
  const lastName = words[words.length - 1]
  return lastName.charAt(0).toUpperCase()
}

/**
 * Get a consistent color for an avatar based on the name
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-orange-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-teal-500',
  ]
  
  // Use name length and char codes to get consistent color
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}
