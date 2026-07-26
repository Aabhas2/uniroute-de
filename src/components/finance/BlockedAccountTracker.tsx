import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'
import { ClientCurrency } from '../ui/ClientCurrency'
import { countriesConfig } from '@/data/countries'
import { SavingsGoal } from '@/types'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { convertCurrency } from '@/lib/utils'

interface BlockedAccountTrackerProps {
  savingsGoals: SavingsGoal[]
  targetCountry?: string
}

export function BlockedAccountTracker({ savingsGoals }: BlockedAccountTrackerProps) {
  const { settings } = useTheme()
  const primaryCurrency = settings.currency.primary || 'EUR'
  const rates = settings.currency.exchangeRates || { EUR: 1, USD: 1.14, INR: 109.88 }
  const config = countriesConfig['Germany']
  
  const blockedAccountSavings = useMemo(() => {
    return savingsGoals.filter(goal => {
      const searchStr = goal.title.toLowerCase()
      return (
        searchStr.includes('blocked account') || 
        searchStr.includes('sperrkonto') ||
        searchStr.includes('gic') ||
        searchStr.includes('bank guarantee') ||
        searchStr.includes('visa fund')
      )
    })
  }, [savingsGoals])

  if (!config || !config.visaAmount) return null

  const requiredEUR = parseInt(config.visaAmount.replace(/,/g, ''), 10)
  const totalSavedEUR = blockedAccountSavings.reduce((sum, goal) => {
    const goalCurr = goal.currency || 'EUR'
    return sum + convertCurrency(goal.currentAmount, goalCurr, 'EUR', rates)
  }, 0)

  const progressPercentage = Math.min((totalSavedEUR / requiredEUR) * 100, 100)
  const isComplete = totalSavedEUR >= requiredEUR

  const convertedSaved = convertCurrency(totalSavedEUR, 'EUR', primaryCurrency, rates)
  const convertedRequired = convertCurrency(requiredEUR, 'EUR', primaryCurrency, rates)

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative">
      <div className="absolute -right-10 -top-10 text-primary/10 rotate-12">
        <ShieldCheck className="w-48 h-48" />
      </div>
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            Visa Funds Requirement: {config.visaType.split('—')[0].trim()}
          </CardTitle>
          {isComplete ? (
            <span className="bg-success/20 text-success text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 border border-success/30">
              <ShieldCheck className="h-3 w-3" />
              Fully Funded
            </span>
          ) : (
            <span className="bg-warning/20 text-warning text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 border border-warning/30">
              <AlertCircle className="h-3 w-3" />
              Action Required
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          German student visa requirement: prove €11,904/year (€992/month) in a German Blocked Account (Sperrkonto).
        </p>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
          <div>
            <div className="text-3xl font-bold text-foreground flex items-baseline gap-2">
              <ClientCurrency amount={convertedSaved} currency={primaryCurrency} />
              {primaryCurrency !== 'EUR' && (
                <span className="text-sm text-muted-foreground font-normal">
                  (<ClientCurrency amount={totalSavedEUR} currency="EUR" />)
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Currently saved</p>
          </div>
          
          <div className="text-right">
            <div className="text-xl font-semibold text-foreground flex items-baseline justify-end gap-2">
              <ClientCurrency amount={convertedRequired} currency={primaryCurrency} />
              {primaryCurrency !== 'EUR' && (
                <span className="text-xs text-muted-foreground font-normal">
                  (<ClientCurrency amount={requiredEUR} currency="EUR" />)
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Required amount (€992/mo limit)</p>
          </div>
        </div>

        <div className="relative pt-1">
          <ProgressBar 
            value={totalSavedEUR}
            max={requiredEUR} 
            className="h-3 mb-1" 
            variant={isComplete ? 'success' : 'default'}
          />
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>0%</span>
            <span>{progressPercentage.toFixed(1)}%</span>
            <span>100%</span>
          </div>
        </div>
        
        {blockedAccountSavings.length === 0 && (
          <div className="mt-4 p-3 bg-card border border-border rounded-md text-sm text-muted-foreground flex gap-2">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <p>
              To track your progress here, create a Savings Goal with &quot;Blocked Account&quot;, &quot;Sperrkonto&quot;, or &quot;Visa Fund&quot; in the title or category.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
