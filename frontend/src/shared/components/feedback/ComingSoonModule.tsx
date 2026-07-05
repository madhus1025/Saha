import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'

interface ComingSoonModuleProps {
  title: string
  description: string
  features: string[]
}

export function ComingSoonModule({ title, description, features }: ComingSoonModuleProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-header">{title}</h1>
        <p className="text-sandstone-500 dark:text-sandstone-400 mt-1">{description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="text-center" padding="lg">
          <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-7 h-7 text-gold-500 dark:text-gold-400" />
          </div>

          <h2 className="text-2xl font-medium text-sandstone-800 dark:text-sandstone-200">
            Coming Soon
          </h2>
          <p className="text-sandstone-500 dark:text-sandstone-400 mt-2 mb-8 text-balance leading-relaxed">
            The {title} module is currently under development.
            <br />
            The architecture is fully in place — ready for implementation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-sandstone-50 dark:bg-sandstone-900/50 border border-sandstone-100 dark:border-sandstone-800"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                <span className="text-sm text-sandstone-700 dark:text-sandstone-300">{feature}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
