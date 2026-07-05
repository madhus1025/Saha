import { Eye, X } from 'lucide-react'
import { usePartnerViewStore } from '@/shared/stores/partner-view.store'
import { motion, AnimatePresence } from 'framer-motion'

export function PartnerViewBanner() {
  const { isViewingAsPartner, partnerName, exitPartnerView } = usePartnerViewStore()

  return (
    <AnimatePresence>
      {isViewingAsPartner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-gradient-copper px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-white">
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Viewing as {partnerName} — Read Only Mode
              </span>
            </div>
            <button
              onClick={exitPartnerView}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
              aria-label="Exit partner view"
            >
              <X className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
