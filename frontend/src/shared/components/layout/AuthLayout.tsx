import { Outlet } from 'react-router'
import { motion } from 'framer-motion'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-warm flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-600 via-forest-500 to-forest-600" />

        {/* Geometric pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#9fc7a4" strokeWidth="0.5" opacity="0.8">
              {/* Concentric diamond rings */}
              <polygon points="300,50 550,200 550,600 300,750 50,600 50,200" fill="none" />
              <polygon points="300,100 500,230 500,570 300,700 100,570 100,230" fill="none" />
              <polygon points="300,150 450,260 450,540 300,650 150,540 150,260" fill="none" />
              <polygon points="300,200 400,290 400,510 300,600 200,510 200,290" fill="none" />
              {/* Central lotus */}
              <circle cx="300" cy="400" r="80" fill="none" />
              <circle cx="300" cy="400" r="55" fill="none" />
              <circle cx="300" cy="400" r="30" fill="none" />
              {/* Radial lines */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <line
                  key={i}
                  x1="300"
                  y1="400"
                  x2={300 + 200 * Math.cos((angle * Math.PI) / 180)}
                  y2={400 + 200 * Math.sin((angle * Math.PI) / 180)}
                />
              ))}
            </g>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src="/favicon.svg" alt="Saha" className="w-8 h-8" />
              <span className="font-display text-2xl font-light tracking-widest text-cream-200">
                Saha
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <p className="font-display text-5xl font-light leading-tight text-cream-200">
                One heart.
                <br />
                <span className="text-sage-300">Two souls.</span>
                <br />
                Together.
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-cream-300 text-lg font-light leading-relaxed max-w-xs"
            >
              A private digital home where two people build a life — together.
            </motion.p>
          </div>

          <p className="text-cream-400 text-sm">
            © 2026 Saha. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/favicon.svg" alt="Saha" className="w-8 h-8" />
            <span className="font-display text-2xl font-light tracking-widest text-forest-700 dark:text-cream-200">
              Saha
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
