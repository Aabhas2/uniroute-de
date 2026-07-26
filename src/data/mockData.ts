// Helper: returns a Date N days from now
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)

import { University, Exam, Scholarship, FinanceItem, SavingsGoal, VisaStep, Task, Note } from '@/types'

export const mockUniversities: University[] = [
  {
    id: '1',
    name: 'Technical University of Munich (TUM)',
    location: 'Munich, Bavaria',
    course: 'Computer Science (M.Sc.)',
    language: 'English',
    applicationDeadline: daysFromNow(75),
    status: 'Applied',
    website: 'https://www.tum.de',
    notes: 'Strong in AI and Machine Learning'
  },
  {
    id: '2',
    name: 'RWTH Aachen University',
    location: 'Aachen, North Rhine-Westphalia',
    course: 'Data Science (M.Sc.)',
    language: 'English',
    applicationDeadline: daysFromNow(105),
    status: 'Interested',
    website: 'https://www.rwth-aachen.de'
  },
  {
    id: '3',
    name: 'University of Stuttgart',
    location: 'Stuttgart, Baden-Württemberg',
    course: 'Information Technology (M.Sc.)',
    language: 'English',
    applicationDeadline: daysFromNow(55),
    status: 'Applied',
    website: 'https://www.uni-stuttgart.de'
  }
]

export const mockExams: Exam[] = [
  {
    id: '1',
    name: 'IELTS Academic',
    registrationLink: 'https://www.ielts.org',
    fee: 250,
    plannedDate: daysFromNow(45),
    status: 'Registered',
    preparationResources: ['Cambridge IELTS Books', 'Online Practice Tests', 'Speaking Partner']
  },
  {
    id: '2',
    name: 'TestAS',
    registrationLink: 'https://www.testas.de',
    fee: 200,
    plannedDate: daysFromNow(80),
    status: 'To Register',
    preparationResources: ['TestAS Preparation Course', 'Sample Tests']
  },
  {
    id: '3',
    name: 'APS Certificate',
    fee: 175,
    status: 'Completed',
    actualDate: daysFromNow(-30),
    score: 'Passed',
    preparationResources: ['Academic Transcript Review', 'Interview Preparation']
  }
]

export const mockScholarships: Scholarship[] = [
  {
    id: '1',
    name: 'DAAD Scholarship',
    amount: 861,
    currency: 'EUR',
    eligibility: 'Master\'s students from developing countries',
    deadline: daysFromNow(120),
    status: 'To Apply',
    website: 'https://www.daad.de',
    requirements: ['Academic Excellence', 'Language Proficiency', 'Motivation Letter']
  },
  {
    id: '2',
    name: 'Deutschland Stipendium',
    amount: 300,
    currency: 'EUR',
    eligibility: 'High-achieving students',
    deadline: daysFromNow(90),
    status: 'Applied',
    requirements: ['Good Grades', 'Social Engagement', 'Financial Need']
  }
]

export const mockFinanceItems: FinanceItem[] = [
  {
    id: '1',
    category: 'Application',
    description: 'University Application Fees',
    estimatedAmount: 150,
    actualAmount: 125,
    currency: 'EUR',
    paid: true
  },
  {
    id: '2',
    category: 'Travel',
    description: 'Flight Ticket',
    estimatedAmount: 800,
    currency: 'EUR',
    paid: false
  },
  {
    id: '3',
    category: 'Living',
    description: 'First Month Rent + Deposit',
    estimatedAmount: 1200,
    currency: 'EUR',
    paid: false
  },
  {
    id: '4',
    category: 'Tuition',
    description: 'Semester Fee',
    estimatedAmount: 350,
    currency: 'EUR',
    paid: false
  }
]

export const mockSavingsGoals: SavingsGoal[] = [
  {
    id: '1',
    title: 'Study Abroad Fund',
    targetAmount: 15000,
    currentAmount: 8500,
    currency: 'EUR',
    deadline: daysFromNow(120),
    description: 'Total fund needed for first year in Germany',
    createdAt: daysFromNow(-90)
  },
  {
    id: '2',
    title: 'Emergency Fund',
    targetAmount: 3000,
    currentAmount: 1200,
    currency: 'EUR',
    deadline: daysFromNow(90),
    description: 'Emergency backup fund for unexpected expenses',
    createdAt: daysFromNow(-60)
  },
  {
    id: '3',
    title: 'Travel & Setup',
    targetAmount: 2000,
    currentAmount: 750,
    currency: 'EUR',
    description: 'Flight tickets, initial setup, and moving expenses',
    createdAt: daysFromNow(-30)
  }
]

export const mockVisaSteps: VisaStep[] = [
  {
    id: '1',
    title: 'Gather Required Documents',
    description: 'Collect all necessary documents for visa application',
    status: 'In Progress',
    dueDate: daysFromNow(50),
    documents: ['Passport', 'University Admission Letter', 'Financial Proof', 'Health Insurance']
  },
  {
    id: '2',
    title: 'Book Visa Appointment',
    description: 'Schedule appointment at German consulate',
    status: 'Pending',
    dueDate: daysFromNow(70),
    documents: ['Completed Application Form']
  },
  {
    id: '3',
    title: 'Attend Visa Interview',
    description: 'Attend the scheduled visa interview',
    status: 'Pending',
    documents: ['All original documents', 'Copies of documents']
  },
  {
    id: '5',
    title: 'Travel Health Insurance',
    description: 'Get travel insurance for the initial days before public health insurance starts',
    status: 'Pending',
    documents: ['Travel Insurance Certificate'],
    notes: 'Required for visa stamping'
  }
]

export const germanScholarshipsDB: Scholarship[] = [
  {
    id: 'db-daad-1',
    name: 'DAAD Study Scholarships - Master Studies for All Academic Disciplines',
    amount: 934,
    currency: 'EUR',
    eligibility: 'Excellent academic record, bachelor degree (max 6 years old)',
    deadline: new Date(new Date().getFullYear(), 10, 15), // roughly Nov 15
    status: 'To Apply',
    website: 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/',
    requirements: ['SOP (Letter of Motivation)', 'LOR from University Professor', 'Language Certificate']
  },
  {
    id: 'db-deutschlandstipendium-1',
    name: 'Deutschlandstipendium',
    amount: 300,
    currency: 'EUR',
    eligibility: 'Enrolled students at a German university with outstanding academic achievements',
    deadline: new Date(new Date().getFullYear(), 5, 30), // Varies, but usually Summer
    status: 'To Apply',
    website: 'https://www.deutschlandstipendium.de/deutschlandstipendium/de/services/english/the-deutschlandstipendium-making-a-great-idea-happen.html',
    requirements: ['Enrolled at participating university', 'Transcript of Records', 'CV']
  },
  {
    id: 'db-boell-1',
    name: 'Heinrich Böll Foundation Scholarships',
    amount: 934,
    currency: 'EUR',
    eligibility: 'All subjects, must have excellent German language skills (B2/C1)',
    deadline: new Date(new Date().getFullYear(), 2, 1), // March 1
    status: 'To Apply',
    website: 'https://www.boell.de/en/scholarships',
    requirements: ['Proof of German proficiency (B2+)', 'Excellent academic record', 'Social/political engagement']
  },
  {
    id: 'db-ebert-1',
    name: 'Friedrich Ebert Foundation',
    amount: 934,
    currency: 'EUR',
    eligibility: 'International students studying in Germany with social/political involvement',
    deadline: new Date(new Date().getFullYear(), 4, 30), // varying deadlines
    status: 'To Apply',
    website: 'https://www.fes.de/studienfoerderung/bewerbung',
    requirements: ['Social/Political engagement', 'German C1 level', 'Reference from university teacher']
  }
]

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete IELTS Registration',
    description: 'Register for IELTS exam and pay the exam fees',
    category: 'Exams',
    priority: 'High',
    status: 'In Progress',
    dueDate: daysFromNow(20),
    createdAt: daysFromNow(-10)
  },
  {
    id: '2',
    title: 'Write SOP / Motivation Letter for TUM',
    description: 'Draft and finalize the Statement of Purpose for TUM application',
    category: 'Applications',
    priority: 'High',
    status: 'To Do',
    dueDate: daysFromNow(40),
    createdAt: daysFromNow(-5)
  },
  {
    id: '3',
    title: 'Research Housing & Accommodation',
    description: 'Shortlist WG rooms and Studentenwerk dormitories in Munich',
    category: 'Accommodation',
    priority: 'Medium',
    status: 'To Do',
    dueDate: daysFromNow(60),
    createdAt: daysFromNow(-3)
  },
  {
    id: '4',
    title: 'Shortlist Universities and Programs',
    description: 'Research and finalize the list of target German universities',
    category: 'Research',
    priority: 'High',
    status: 'Completed',
    dueDate: daysFromNow(-15),
    createdAt: daysFromNow(-30)
  }
]

export const mockNotes: Note[] = [
  {
    id: '1',
    title: 'German Language Learning Tips',
    content: 'Focus on B2 level for most universities. Use Duolingo, Babbel, and practice speaking with native speakers. Grammar is crucial for academic writing.',
    tags: ['language', 'german', 'study-tips'],
    category: 'Language',
    createdAt: daysFromNow(-60),
    updatedAt: daysFromNow(-60)
  },
  {
    id: '2',
    title: 'Cost of Living in Munich',
    content: 'Average monthly expenses: Rent (400-800€), Food (200-300€), Transport (70€), Miscellaneous (150€). Total: ~1000€/month',
    tags: ['finances', 'munich', 'cost-of-living'],
    category: 'Finance',
    createdAt: daysFromNow(-45),
    updatedAt: daysFromNow(-30)
  },
  {
    id: '3',
    title: 'Visa Interview Preparation',
    content: 'Common questions: Why Germany? Why this university? How will you finance your studies? What are your career plans? Practice answers in both English and German.',
    tags: ['visa', 'interview', 'preparation'],
    category: 'Visa',
    createdAt: daysFromNow(-20),
    updatedAt: daysFromNow(-20)
  }
] 