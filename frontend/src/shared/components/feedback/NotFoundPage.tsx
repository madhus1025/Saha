import { Link } from 'react-router'
import { motion } from 'framer-motion'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <p className="font-display text-[120px] font-light text-sandstone-200 dark:text-sandstone-800 leading-none select-none">
          404
        </p>
        <h1 className="text-2xl font-medium text-sandstone-800 dark:text-sandstone-200 -mt-4">
          Page not found
        </h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-3 mb-8 text-balance">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="btn-primary"
        >
          Go home
        </Link>
      </motion.div>
    </div>
  )
}
