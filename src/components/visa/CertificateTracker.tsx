'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { FileText, CheckCircle, GraduationCap, AlertCircle, RefreshCw } from 'lucide-react'

export function CertificateTracker() {
  const { settings, updateSettings } = useTheme()

  const certStatus = settings.certificateStatus || {
    aps: 'Not Started',
    dmat: 'Not Started'
  }

  const handleUpdateAps = (status: any) => {
    updateSettings({
      ...settings,
      certificateStatus: { ...certStatus, aps: status }
    })
  }

  const handleUpdateDmat = (status: any) => {
    updateSettings({
      ...settings,
      certificateStatus: { ...certStatus, dmat: status }
    })
  }

  const apsStatuses = ['Not Started', 'Document Collection', 'Applied', 'Processing', 'Received']
  const dmatStatuses = ['Not Started', 'Registered', 'Passed', 'Failed', 'N/A']

  const getStatusColor = (status: string) => {
    if (status === 'Not Started' || status === 'Failed') return 'bg-muted text-muted-foreground'
    if (status === 'Received' || status === 'Passed' || status === 'N/A') return 'bg-success/20 text-success border-success/30'
    return 'bg-warning/20 text-warning border-warning/30'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 fade-in">
      {/* APS Certificate Tracker */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              APS Certificate
            </CardTitle>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(certStatus.aps)}`}>
              {certStatus.aps}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Mandatory for Indian students. Takes 4-8 weeks.</p>
        </CardHeader>
        <CardContent>
          <div className="relative pt-4">
            <div className="flex justify-between mb-2 relative z-10">
              {apsStatuses.map((s, i) => {
                const currentIndex = apsStatuses.indexOf(certStatus.aps)
                const isActive = i <= currentIndex
                return (
                  <div key={s} className="flex flex-col items-center">
                    <button
                      onClick={() => handleUpdateAps(s)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isActive 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-card border-muted hover:border-primary/50'
                      }`}
                      title={s}
                    >
                      {isActive && <CheckCircle className="w-3 h-3" />}
                    </button>
                    <span className={`text-[10px] mt-1 text-center max-w-[50px] leading-tight ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {s}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-6 left-2 right-2 h-0.5 bg-muted -z-0"></div>
            <div 
              className="absolute top-6 left-2 h-0.5 bg-primary -z-0 transition-all duration-300" 
              style={{ width: `calc(${(apsStatuses.indexOf(certStatus.aps) / (apsStatuses.length - 1)) * 100}% - 4px)` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* dMAT Test Tracker */}
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              dMAT Exam
            </CardTitle>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(certStatus.dmat)}`}>
              {certStatus.dmat}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">For Summer 2027+ Master&apos;s (Engineering/Business).</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 pt-2">
            {dmatStatuses.map((s) => (
              <button
                key={s}
                onClick={() => handleUpdateDmat(s)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  certStatus.dmat === s
                    ? 'bg-primary/10 border-primary text-primary font-medium'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {certStatus.dmat === 'Not Started' && (
             <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
               <AlertCircle className="w-4 h-4 text-warning shrink-0" />
               <p>If you registered for APS before 29 June 2026, or aren&apos;t doing Eng/Biz, select &quot;N/A&quot;.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
