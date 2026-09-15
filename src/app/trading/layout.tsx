import TradingNav from '@/components/trading/trading-nav'
import ThemeToggle from '@/components/theme-toggle'

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-background text-foreground'>
      <header className='border-b border-border'>
        <div className='max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center shrink-0 text-[13px] font-bold'>T</div>
            <span className='text-sm font-semibold'>Trading</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <TradingNav />
      <main className='max-w-[1400px] mx-auto'>{children}</main>
    </div>
  )
}
