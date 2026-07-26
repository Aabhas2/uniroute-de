'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Languages, BookOpen, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react'

const germanLevels = ['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function LanguageTracker() {
  const { settings, updateSettings } = useTheme()
  const langStatus = settings.languageStatus || {
    german: { exam: 'None', currentLevel: 'None', targetLevel: 'B2' },
    english: { exam: 'None', currentScore: '', targetScore: '' }
  }

  const handleUpdateGerman = (field: string, value: string) => {
    updateSettings({
      ...settings,
      languageStatus: {
        ...langStatus,
        german: { ...langStatus.german, [field]: value }
      }
    })
  }

  const handleUpdateEnglish = (field: string, value: string) => {
    updateSettings({
      ...settings,
      languageStatus: {
        ...langStatus,
        english: { ...langStatus.english, [field]: value }
      }
    })
  }

  const currentIndex = germanLevels.indexOf(langStatus.german.currentLevel)
  const targetIndex = germanLevels.indexOf(langStatus.german.targetLevel)
  const gap = Math.max(0, targetIndex - currentIndex)
  const isTargetMet = currentIndex >= targetIndex

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 fade-in">
      {/* German Language Tracker */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              German Proficiency
            </CardTitle>
            <select
              value={langStatus.german.exam}
              onChange={(e) => handleUpdateGerman('exam', e.target.value)}
              className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="None">No Exam Selected</option>
              <option value="TestDaF">TestDaF</option>
              <option value="DSH">DSH</option>
              <option value="Goethe">Goethe-Zertifikat</option>
              <option value="telc">telc</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mt-2 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current:</span>
              <select 
                value={langStatus.german.currentLevel}
                onChange={(e) => handleUpdateGerman('currentLevel', e.target.value)}
                className="bg-transparent border-b border-border outline-none font-medium text-foreground focus:border-primary"
              >
                {germanLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Target:</span>
              <select 
                value={langStatus.german.targetLevel}
                onChange={(e) => handleUpdateGerman('targetLevel', e.target.value)}
                className="bg-transparent border-b border-border outline-none font-medium text-foreground focus:border-primary"
              >
                {germanLevels.slice(1).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>
          </div>

          {/* Visual Track */}
          <div className="relative pt-4 pb-2">
            <div className="flex justify-between mb-2 relative z-10">
              {germanLevels.slice(1).map((lvl, i) => {
                const isActive = (i + 1) <= currentIndex
                const isTarget = (i + 1) === targetIndex
                return (
                  <div key={lvl} className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors border-2 ${
                        isActive ? 'bg-primary border-primary text-primary-foreground' : 
                        isTarget ? 'bg-card border-warning' : 'bg-card border-muted'
                      }`}
                    >
                      {isActive && <CheckCircle className="w-3 h-3" />}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${isTarget ? 'text-warning' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {lvl}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-6 left-2 right-2 h-0.5 bg-muted -z-0"></div>
            <div 
              className="absolute top-6 left-2 h-0.5 bg-primary -z-0 transition-all duration-300" 
              style={{ width: `calc((100% - 16px) * ${Math.max(0, currentIndex - 1) / (germanLevels.length - 2)})` }}
            ></div>
          </div>

          <div className={`mt-3 p-2 rounded-md border flex items-center gap-2 text-xs ${
            isTargetMet 
              ? 'bg-success/10 border-success/20 text-success' 
              : 'bg-muted/50 border-border text-muted-foreground'
          }`}>
            {isTargetMet ? (
              <><CheckCircle className="w-4 h-4 shrink-0" /> Target level reached! Ready for {langStatus.german.exam !== 'None' ? langStatus.german.exam : 'exam'}.</>
            ) : gap > 0 ? (
              <><TrendingUp className="w-4 h-4 shrink-0 text-primary" /> Gap: {gap} level{gap > 1 ? 's' : ''}. Keep studying!</>
            ) : (
              <><AlertCircle className="w-4 h-4 shrink-0" /> Set your current and target levels.</>
            )}
          </div>
        </CardContent>
      </Card>

      {/* English Language Tracker */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              English Proficiency
            </CardTitle>
            <select
              value={langStatus.english.exam}
              onChange={(e) => handleUpdateEnglish('exam', e.target.value)}
              className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="None">No Exam Selected</option>
              <option value="IELTS">IELTS</option>
              <option value="TOEFL">TOEFL</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Target Score</label>
              <input 
                type="text"
                placeholder="e.g. 6.5 or 90"
                value={langStatus.english.targetScore}
                onChange={(e) => handleUpdateEnglish('targetScore', e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Current/Mock Score</label>
              <input 
                type="text"
                placeholder="e.g. 6.0 or 85"
                value={langStatus.english.currentScore}
                onChange={(e) => handleUpdateEnglish('currentScore', e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="mt-4 p-2 bg-muted/30 border border-border rounded-md text-xs text-muted-foreground flex items-center gap-2">
             <AlertCircle className="w-4 h-4 shrink-0" />
             Many German English-taught programs require IELTS 6.5 or TOEFL 90+.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
