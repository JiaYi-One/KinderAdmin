"use client"
import React, { useState, useEffect } from 'react'
import { Slot } from "@radix-ui/react-slot"
import * as LabelPrimitive from "@radix-ui/react-label"
import { FileText, BookOpen } from 'lucide-react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { sendPushNotification } from '../notifications/pushyClient'
import { 
  ExamReportForm, 
  AcademicDevelopmentForm, 
  SocialEmotionalForm, 
  PhysicalCreativeForm, 
  DefaultForm 
} from './report_type'

// Utility function
function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Card Components
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "card shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("card-header", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "card-title h5 mb-0",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-muted small", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-body", className)} {...props} />
))
CardContent.displayName = "CardContent"

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const getVariantClass = (variant: string) => {
      switch (variant) {
        case 'destructive': return 'btn-danger'
        case 'outline': return 'btn-outline-secondary'
        case 'secondary': return 'btn-secondary'
        case 'ghost': return 'btn-link'
        case 'link': return 'btn-link'
        default: return 'btn-primary'
      }
    }
    
    const getSizeClass = (size: string) => {
      switch (size) {
        case 'sm': return 'btn-sm'
        case 'lg': return 'btn-lg'
        case 'icon': return 'btn-sm'
        default: return ''
      }
    }
    
    return (
      <Comp
        className={cn('btn', getVariantClass(variant), getSizeClass(size), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Input Component
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "form-control",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Label Component
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("form-label", className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

// Textarea Component
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "form-control",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

// Simple Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value?: string
  onValueChange?: (value: string) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, value, onValueChange, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn("form-select", className)}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

// Main Component Interfaces
interface ReportData {
  className: string
  studentName: string
  studentId: string
  reportType: string
  academicPeriod: string
  examType: string
  subjects: Subject[]
  comments: string
  overallGrade: string
  teacherName: string
  date: string
}

interface Subject {
  name: string
  grade: string
  comments: string
}

interface Class {
  id: string
  name: string
}

interface Student {
  id: string
  name: string
  classId: string
}

interface ReportDataToStore {
  studentId: string
  classId: string
  type: string
  term: string
  createdAt: unknown
  teacherName: string
  reportDate: string
  data: Record<string, unknown>
}

function TeacherReportForm() {
  const [reportData, setReportData] = useState<ReportData>({
    className: '',
    studentName: '',
    studentId: '',
    reportType: '',
    academicPeriod: '',
    examType: '',
    subjects: [
      { name: 'Mathematics', grade: '', comments: '' },
      { name: 'English', grade: '', comments: '' },
      { name: 'Science', grade: '', comments: '' },
      { name: 'Malay', grade: '', comments: '' },
      { name: 'Chinese', grade: '', comments: '' },
    ],
    comments: '',
    overallGrade: '',
    teacherName: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Separate state for year and quarter
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedQuarter, setSelectedQuarter] = useState('')

  // Auto-assign current year on mount and when resetting
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear().toString()
    if (!selectedYear) {
      setSelectedYear(year)
      if (selectedQuarter) {
        setReportData(prev => ({ ...prev, academicPeriod: `${year}-${selectedQuarter}` }))
      }
    }
  }, [selectedYear, selectedQuarter, setReportData])

  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])

  const [loading, setLoading] = useState(true)
  
  // State for radio button selections in developmental reports
  const [academicAssessments, setAcademicAssessments] = useState<Record<string, string>>({})
  const [socialAssessments, setSocialAssessments] = useState<Record<string, string>>({})
  const [physicalAssessments, setPhysicalAssessments] = useState<Record<string, string>>({})

  // Fetch classes from Firebase
  const fetchClasses = async () => {
    try {
      const classesRef = collection(db, "classes")
      const querySnapshot = await getDocs(classesRef)
      
      const fetchedClasses: Class[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedClasses.push({
          id: doc.id,
          name: data.name || doc.id
        })
      })
      
      setClasses(fetchedClasses)
    } catch (error) {
      console.error("Error fetching classes:", error)
      setClasses([])
    }
  }

  // Fetch students from Firebase
  const fetchStudents = async () => {
    try {
      const studentsRef = collection(db, "students")
      const querySnapshot = await getDocs(studentsRef)
      
      const fetchedStudents: Student[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedStudents.push({
          id: doc.id,
          name: data.name || 'Unknown Student',
          classId: data.class_id || ''
        })
      })
      
      setStudents(fetchedStudents)
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    }
  }

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get teacher name from user email or display name
        const teacherName = user.displayName || user.email?.split('@')[0] || 'Teacher'
        setReportData(prev => ({ ...prev, teacherName }))
        
        // Fetch actual data from Firebase
        await Promise.all([fetchClasses(), fetchStudents()])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleClassChange = (classId: string) => {
    setReportData(prev => ({ 
      ...prev, 
      className: classes.find(c => c.id === classId)?.name || '',
      studentName: '',
      studentId: ''
    }))
    
    // Filter students based on selected class
    const classStudents = students.filter(student => student.classId === classId)
    setAvailableStudents(classStudents)
  }

  const handleStudentChange = (studentId: string) => {
    const student = availableStudents.find(s => s.id === studentId)
    setReportData(prev => ({ 
      ...prev, 
      studentName: student?.name || '',
      studentId: studentId
    }))
  }

  const handleSubjectChange = (index: number, field: keyof Subject, value: string) => {
    const updatedSubjects = [...reportData.subjects]
    updatedSubjects[index] = { ...updatedSubjects[index], [field]: value }
    
    // Auto-assign grade based on score
    if (field === 'comments') {
      const score = parseInt(value)
      if (!isNaN(score)) {
        let grade = ''
        if (score >= 80) grade = 'A'
        else if (score >= 70) grade = 'B'
        else if (score >= 60) grade = 'C'
        else if (score >= 50) grade = 'D'
        else if (score >= 40) grade = 'E'
        else if (score < 40) grade = 'F'
        
        updatedSubjects[index] = { ...updatedSubjects[index], grade }
      }
    }
    
    setReportData({ ...reportData, subjects: updatedSubjects })
  }

  const handleDeleteSubject = (index: number) => {
    const updatedSubjects = reportData.subjects.filter((_, i) => i !== index)
    setReportData({ ...reportData, subjects: updatedSubjects })
  }

  const handleAddSubject = () => {
    const newSubject = { name: '', grade: '', comments: '' }
    setReportData({ ...reportData, subjects: [...reportData.subjects, newSubject] })
  }

  // Handle year change
  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    const academicPeriod = year && selectedQuarter ? `${year}-${selectedQuarter}` : ''
    setReportData({ ...reportData, academicPeriod })
  }

  // Handle quarter change
  const handleQuarterChange = (quarter: string) => {
    setSelectedQuarter(quarter)
    const academicPeriod = selectedYear && quarter ? `${selectedYear}-${quarter}` : ''
    setReportData({ ...reportData, academicPeriod })
  }

  // Function to validate form data
  const validateForm = (): { isValid: boolean; errors: string[]; scrollToSubjects?: boolean; scrollToSection?: string } => {
    const errors: string[] = []
    let scrollToSubjects = false
    let scrollToSection = ''

    // Basic required fields
    if (!reportData.className) errors.push('Class is required')
    if (!reportData.studentName) errors.push('Student is required')
    if (!reportData.studentId) errors.push('Student ID is required')
    if (!reportData.reportType) errors.push('Report type is required')
    if (!reportData.academicPeriod) errors.push('Academic period is required')
    if (!reportData.date) errors.push('Report date is required')
    if (!reportData.comments.trim()) errors.push('General comments are required')

    // Validate based on report type
    switch (reportData.reportType) {
      case 'exam': {
        // Check if exam type is selected
        if (!reportData.examType || reportData.examType === '') {
          errors.push('Exam type is required for exam reports')
        }
        
        // Enhanced subject validation
        const subjectsWithNames = reportData.subjects.filter(subject => 
          subject.name.trim() !== ''
        )
        
        if (subjectsWithNames.length === 0) {
          errors.push('At least one subject must have a name')
          scrollToSubjects = true
        }
        
        // Check if subjects have both names and scores
        const subjectsWithScores = reportData.subjects.filter(subject => 
          subject.name.trim() !== '' && subject.comments.trim() !== '' && !isNaN(parseInt(subject.comments))
        )
        
        if (subjectsWithScores.length === 0) {
          errors.push('At least one subject must have both a name and a score')
          scrollToSubjects = true
        }
        
        // Check for subjects with names but no scores
        const subjectsWithNamesNoScores = reportData.subjects.filter(subject => 
          subject.name.trim() !== '' && (subject.comments.trim() === '' || isNaN(parseInt(subject.comments)))
        )
        
        if (subjectsWithNamesNoScores.length > 0) {
          errors.push('All subjects with names must have valid scores (0-100)')
          scrollToSubjects = true
        }
        
        // Check for valid score ranges
        const invalidScores = reportData.subjects.filter(subject => 
          subject.name.trim() !== '' && subject.comments.trim() !== '' && 
          (parseInt(subject.comments) < 0 || parseInt(subject.comments) > 100)
        )
        
        if (invalidScores.length > 0) {
          errors.push('All scores must be between 0 and 100')
          scrollToSubjects = true
        }
        
        break
      }

      case 'academic': {
        // Check if at least one complete section is fully filled
        const academicSections = {
          'Language & Communication': ['thoughts', 'vocabulary', 'instructions', 'discussions', 'questions', 'uppercase', 'lowercase', 'sounds', 'books', 'writing'],
          'Mathematical Thinking': ['numbers', 'counting', 'concepts', 'operations', 'basic', 'colors', 'patterns', 'sorting'],
          'Cognitive Skills': ['problems', 'attention', 'memory', 'connections', 'curiosity'],
          'Learning Habits': ['tasks', 'independent', 'help', 'persistence', 'materials']
        }
        
        const fullyCompletedSections = Object.entries(academicSections).filter(([, skills]) => {
          const completedSkills = skills.filter(skill => academicAssessments[skill])
          return completedSkills.length === skills.length // All skills in the section must be filled
        })
        
        if (fullyCompletedSections.length === 0) {
          errors.push('At least one complete section must be fully filled for Academic Development Report (all skills in that section must be assessed)')
          
          // Find the section with the most completed skills to scroll to
          const sectionProgress = Object.entries(academicSections).map(([sectionName, skills]) => {
            const completedSkills = skills.filter(skill => academicAssessments[skill])
            return { sectionName, completedCount: completedSkills.length, totalCount: skills.length }
          })
          
          const bestSection = sectionProgress.reduce((best, current) => 
            current.completedCount > best.completedCount ? current : best
          )
          
          // Map section names to data attributes
          const sectionMap: Record<string, string> = {
            'Language & Communication': 'academic-language',
            'Mathematical Thinking': 'academic-math',
            'Cognitive Skills': 'academic-cognitive',
            'Learning Habits': 'academic-learning'
          }
          
          scrollToSection = sectionMap[bestSection.sectionName] || 'academic-language'
        }
        break
      }

      case 'social': {
        // Check if at least one complete section is fully filled
        const socialSections = {
          'Social Skills': ['cooperative', 'shares', 'turns', 'kindness', 'includes', 'words', 'listens', 'help', 'compromises'],
          'Emotional Development': ['feelings', 'confidence', 'needs', 'pride', 'frustration', 'calms', 'empathy', 'transitions'],
          'Behavior & Classroom Conduct': ['classroom', 'routines', 'listens', 'hand', 'materials', 'turn', 'hands', 'cleanup', 'responsibility'],
          'Relationship with Adults': ['respect', 'directions', 'help', 'comfort']
        }
        
        const fullyCompletedSections = Object.entries(socialSections).filter(([, skills]) => {
          const completedSkills = skills.filter(skill => socialAssessments[skill])
          return completedSkills.length === skills.length // All skills in the section must be filled
        })
        
        if (fullyCompletedSections.length === 0) {
          errors.push('At least one complete section must be fully filled for Social & Emotional Development Report (all skills in that section must be assessed)')
          
          // Find the section with the most completed skills to scroll to
          const sectionProgress = Object.entries(socialSections).map(([sectionName, skills]) => {
            const completedSkills = skills.filter(skill => socialAssessments[skill])
            return { sectionName, completedCount: completedSkills.length, totalCount: skills.length }
          })
          
          const bestSection = sectionProgress.reduce((best, current) => 
            current.completedCount > best.completedCount ? current : best
          )
          
          // Map section names to data attributes
          const sectionMap: Record<string, string> = {
            'Social Skills': 'social-skills',
            'Emotional Development': 'social-emotional',
            'Behavior & Classroom Conduct': 'social-behavior',
            'Relationship with Adults': 'social-adults'
          }
          
          scrollToSection = sectionMap[bestSection.sectionName] || 'social-skills'
        }
        break
      }

      case 'physical': {
        // Check if at least one complete section is fully filled
        const physicalSections = {
          'Gross Motor Skills': ['runs', 'jumps', 'climbs', 'balance', 'balls', 'pe'],
          'Fine Motor Skills': ['pencil', 'scissors', 'draws', 'tools', 'manipulates', 'coordination'],
          'Self-Care & Independence': ['clothing', 'bathroom', 'hands', 'lunch']
        }
        
        const fullyCompletedSections = Object.entries(physicalSections).filter(([, skills]) => {
          const completedSkills = skills.filter(skill => physicalAssessments[skill])
          return completedSkills.length === skills.length // All skills in the section must be filled
        })
        
        if (fullyCompletedSections.length === 0) {
          errors.push('At least one complete section must be fully filled for Physical & Creative Development Report (all skills in that section must be assessed)')
          scrollToSection = 'physical-development'
        }
        break
      }
    }

    return { isValid: errors.length === 0, errors, scrollToSubjects, scrollToSection }
  }

  // Function to reset all form data to initial state
  const resetForm = () => {
    const now = new Date()
    const year = now.getFullYear().toString()
    setReportData({
      className: '',
      studentName: '',
      studentId: '',
      reportType: '',
      academicPeriod: '',
      examType: '',
      subjects: [
        { name: 'Mathematics', grade: '', comments: '' },
        { name: 'English', grade: '', comments: '' },
        { name: 'Science', grade: '', comments: '' },
        { name: 'Malay', grade: '', comments: '' },
        { name: 'Chinese', grade: '', comments: '' },
      ],
      comments: '',
      overallGrade: '',
      teacherName: reportData.teacherName, // Keep teacher name from auth
      date: new Date().toISOString().split('T')[0]
    })
    setSelectedYear(year)
    setSelectedQuarter('')
    
    // Reset assessment states
    setAcademicAssessments({})
    setSocialAssessments({})
    setPhysicalAssessments({})
    
    // Reset available students
    setAvailableStudents([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form before submission
    const validation = validateForm()
    if (!validation.isValid) {
      alert('Please fix the following errors:\n\n' + validation.errors.join('\n'))
      
      // Scroll to subjects section if there are subject-related errors
      if (validation.scrollToSubjects) {
        setTimeout(() => {
          const subjectsSection = document.querySelector('[data-subjects-section]')
          if (subjectsSection) {
            subjectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
            // Add visual highlight to the subjects section
            subjectsSection.classList.add('border-danger', 'border-2')
            setTimeout(() => {
              subjectsSection.classList.remove('border-danger', 'border-2')
            }, 3000)
          }
        }, 100)
      }
      
      // Scroll to development section if there are development-related errors
      if (validation.scrollToSection) {
        setTimeout(() => {
          const targetSection = document.querySelector(`[data-section="${validation.scrollToSection}"]`)
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
            // Add visual highlight to the section
            targetSection.classList.add('border-danger', 'border-2')
            setTimeout(() => {
              targetSection.classList.remove('border-danger', 'border-2')
            }, 3000)
          }
        }, 100)
      }
      
      return
    }
    
    try {
      // Prepare report data based on type
      const reportDataToStore: ReportDataToStore = {
        studentId: reportData.studentId,
        classId: '', // Will be fetched from student data
        type: reportData.reportType,
        term: reportData.academicPeriod,
        createdAt: serverTimestamp(),
        teacherName: reportData.teacherName,
        reportDate: reportData.date,
        data: {}
      }

      // Get class ID from student data
      const currentStudent = students.find(s => s.id === reportData.studentId)
      if (currentStudent) {
        reportDataToStore.classId = currentStudent.classId
      }

      // Format data based on report type
      switch (reportData.reportType) {
        case 'exam':
          reportDataToStore.data = {
            examType: reportData.examType,
            subjects: reportData.subjects.map(subject => ({
              name: subject.name,
              score: parseInt(subject.comments) || 0,
              grade: subject.grade
            })),
            comments: reportData.comments
          } as Record<string, unknown>
          break

        case 'academic':
          reportDataToStore.data = {
            generalComments: reportData.comments,
            sections: {
              'Language & Communication': {
                'Speaking Skills': Object.fromEntries(
                  Object.entries({
                    'thoughts': academicAssessments.thoughts,
                    'vocabulary': academicAssessments.vocabulary,
                    'instructions': academicAssessments.instructions,
                    'discussions': academicAssessments.discussions,
                    'questions': academicAssessments.questions
                  }).filter(([, value]) => value !== undefined && value !== '')
                ),
                'Early Literacy': Object.fromEntries(
                  Object.entries({
                    'uppercase': academicAssessments.uppercase,
                    'lowercase': academicAssessments.lowercase,
                    'sounds': academicAssessments.sounds,
                    'books': academicAssessments.books,
                    'writing': academicAssessments.writing
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Mathematical Thinking': {
                'Number Concepts': Object.fromEntries(
                  Object.entries({
                    'numbers': academicAssessments.numbers,
                    'counting': academicAssessments.counting,
                    'concepts': academicAssessments.concepts,
                    'operations': academicAssessments.operations
                  }).filter(([, value]) => value !== undefined && value !== '')
                ),
                'Shapes & Patterns': Object.fromEntries(
                  Object.entries({
                    'basic': academicAssessments.basic,
                    'colors': academicAssessments.colors,
                    'patterns': academicAssessments.patterns,
                    'sorting': academicAssessments.sorting
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Cognitive Skills': {
                'Problem Solving': Object.fromEntries(
                  Object.entries({
                    'problems': academicAssessments.problems
                  }).filter(([, value]) => value !== undefined && value !== '')
                ),
                'Attention & Memory': Object.fromEntries(
                  Object.entries({
                    'attention': academicAssessments.attention,
                    'memory': academicAssessments.memory,
                    'connections': academicAssessments.connections,
                    'curiosity': academicAssessments.curiosity
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Learning Habits': {
                'Work Habits': Object.fromEntries(
                  Object.entries({
                    'tasks': academicAssessments.tasks,
                    'independent': academicAssessments.independent,
                    'help': academicAssessments.help,
                    'persistence': academicAssessments.persistence,
                    'materials': academicAssessments.materials
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              }
            },
            sectionOrder: [
              'Language & Communication',
              'Mathematical Thinking', 
              'Cognitive Skills',
              'Learning Habits'
            ],
            subsectionOrder: {
              'Language & Communication': ['Speaking Skills', 'Early Literacy'],
              'Mathematical Thinking': ['Number Concepts', 'Shapes & Patterns'],
              'Cognitive Skills': ['Problem Solving', 'Attention & Memory'],
              'Learning Habits': ['Work Habits']
            }
          } as Record<string, unknown>
          break

        case 'social':
          reportDataToStore.data = {
            generalComments: reportData.comments,
            sections: {
              'Social Skills': {
                'Cooperation': Object.fromEntries(
                  Object.entries({
                    'cooperative': socialAssessments.cooperative,
                    'shares': socialAssessments.shares,
                    'turns': socialAssessments.turns,
                    'kindness': socialAssessments.kindness,
                    'includes': socialAssessments.includes
                  }).filter(([, value]) => value !== undefined && value !== '')
                ),
                'Communication': Object.fromEntries(
                  Object.entries({
                    'words': socialAssessments.words,
                    'listens': socialAssessments.listens,
                    'compromises': socialAssessments.compromises
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Emotional Development': {
                'Self-Awareness': Object.fromEntries(
                  Object.entries({
                    'feelings': socialAssessments.feelings,
                    'confidence': socialAssessments.confidence,
                    'needs': socialAssessments.needs,
                    'pride': socialAssessments.pride
                  }).filter(([, value]) => value !== undefined && value !== '')
                ),
                'Emotional Regulation': Object.fromEntries(
                  Object.entries({
                    'frustration': socialAssessments.frustration,
                    'calms': socialAssessments.calms,
                    'empathy': socialAssessments.empathy,
                    'transitions': socialAssessments.transitions
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Behavior & Classroom Conduct': {
                'Classroom Rules': Object.fromEntries(
                  Object.entries({
                    'classroom': socialAssessments.classroom,
                    'routines': socialAssessments.routines,
                    'hand': socialAssessments.hand,
                    'turn': socialAssessments.turn,
                    'cleanup': socialAssessments.cleanup,
                    'responsibility': socialAssessments.responsibility
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Relationship with Adults': {
                'Respect & Cooperation': Object.fromEntries(
                  Object.entries({
                    'respect': socialAssessments.respect,
                    'directions': socialAssessments.directions,
                    'help': socialAssessments.help,
                    'comfort': socialAssessments.comfort
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              }
            },
            sectionOrder: [
              'Social Skills',
              'Emotional Development',
              'Behavior & Classroom Conduct',
              'Relationship with Adults'
            ],
            subsectionOrder: {
              'Social Skills': ['Cooperation', 'Communication'],
              'Emotional Development': ['Self-Awareness', 'Emotional Regulation'],
              'Behavior & Classroom Conduct': ['Classroom Rules'],
              'Relationship with Adults': ['Respect & Cooperation']
            }
          } as Record<string, unknown>
          break

        case 'physical':
          reportDataToStore.data = {
            generalComments: reportData.comments,
            sections: {
              'Gross Motor Skills': {
                'Movement': Object.fromEntries(
                  Object.entries({
                    'runs': physicalAssessments.runs,
                    'jumps': physicalAssessments.jumps,
                    'climbs': physicalAssessments.climbs,
                    'balance': physicalAssessments.balance,
                    'balls': physicalAssessments.balls,
                    'pe': physicalAssessments.pe
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Fine Motor Skills': {
                'Hand Skills': Object.fromEntries(
                  Object.entries({
                    'pencil': physicalAssessments.pencil,
                    'scissors': physicalAssessments.scissors,
                    'draws': physicalAssessments.draws,
                    'tools': physicalAssessments.tools,
                    'manipulates': physicalAssessments.manipulates,
                    'coordination': physicalAssessments.coordination
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              },
              'Self-Care & Independence': {
                'Daily Living Skills': Object.fromEntries(
                  Object.entries({
                    'clothing': physicalAssessments.clothing,
                    'bathroom': physicalAssessments.bathroom,
                    'lunch': physicalAssessments.lunch
                  }).filter(([, value]) => value !== undefined && value !== '')
                )
              }
            },
            sectionOrder: [
              'Gross Motor Skills',
              'Fine Motor Skills',
              'Self-Care & Independence'
            ],
            subsectionOrder: {
              'Gross Motor Skills': ['Movement'],
              'Fine Motor Skills': ['Hand Skills'],
              'Self-Care & Independence': ['Daily Living Skills']
            }
          } as Record<string, unknown>
          break

        default:
          reportDataToStore.data = {
            generalComments: reportData.comments
          } as Record<string, unknown>
      }

      // Add to Firestore
      const reportsRef = collection(db, 'reports')
      const docRef = await addDoc(reportsRef, reportDataToStore)
      
      console.log('Report saved successfully with ID:', docRef.id)

      // Get student data to find parent information
      const reportSelectedStudent = students.find(s => s.id === reportData.studentId)
      
      if (reportSelectedStudent) {
        try {
          // Get parent information from student data
          const studentDoc = await getDoc(doc(db, 'students', reportData.studentId))
          const studentData = studentDoc.data()
          
          const parentId = studentData?.parentId || reportSelectedStudent.classId // Fallback if needed
          const parentEmail = studentData?.parentEmail || ''
          
          if (parentId) {
            // Create notification record in Firestore
            const notificationRecord = {
              type: "report",
              parentId: parentId,
              isRead: false,
              createdAt: serverTimestamp(),
              message: `New ${reportData.reportType} report available for ${reportData.studentName}`,
              reportId: docRef.id,
              studentName: reportData.studentName,
              reportType: reportData.reportType,
              teacherName: reportData.teacherName,
              reportDate: reportData.date
            }
            
            await addDoc(collection(db, "notifications"), notificationRecord)
            console.log('Notification record created successfully')

            // Send push notification to mobile device
            try {
              const pushSuccess = await sendPushNotification(db, {
                parentId: parentId,
                message: `New ${reportData.reportType} report available for ${reportData.studentName}`,
                type: "report",
                title: "New Report Available",
                entityId: docRef.id,
                parentEmail: parentEmail
              })
              
              if (pushSuccess) {
                console.log('✅ Push notification sent successfully')
                alert('Report saved and notification sent successfully!')
              } else {
                console.warn('⚠️ Report saved but push notification failed')
                alert('Report saved successfully! (Push notification could not be sent)')
              }
            } catch (pushError) {
              console.error('Push notification error:', pushError)
              alert('Report saved successfully! (Push notification could not be sent)')
            }
          } else {
            console.warn('No parent ID found for student')
            alert('Report saved successfully! (Could not send notification - no parent info)')
          }
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError)
          alert('Report saved successfully! (Notification creation failed)')
        }
      } else {
        alert('Report saved successfully! (Could not find student data for notification)')
      }
      
      // Reset form to initial state
      resetForm()
      
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Error saving report. Please try again.')
    }
  }

  // Function to get grade description
  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'A': return 'Excellent'
      case 'B': return 'Very Good'
      case 'C': return 'Good'
      case 'D': return 'Satisfactory'
      case 'E': return 'Poor'
      case 'F': return 'Fail'
      default: return ''
    }
  }

  // Render different forms based on report type
  const renderReportForm = () => {
    const reportProps = {
      reportData,
      setReportData,
      academicAssessments,
      setAcademicAssessments,
      socialAssessments,
      setSocialAssessments,
      physicalAssessments,
      setPhysicalAssessments,
      handleSubjectChange,
      handleDeleteSubject,
      handleAddSubject,
      getGradeDescription
    }

    switch (reportData.reportType) {
      case 'exam':
        return <ExamReportForm {...reportProps} />
      case 'academic':
        return <AcademicDevelopmentForm {...reportProps} />
      case 'social':
        return <SocialEmotionalForm {...reportProps} />
      case 'physical':
        return <PhysicalCreativeForm {...reportProps} />
      default:
        return <DefaultForm />
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      
      
      {/* Basic Information Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="h4 fw-semibold mb-0">Student Information</h3>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <Label htmlFor="className">Class <span className="text-danger">*</span></Label>
              <Select 
                value={reportData.className ? classes.find(c => c.name === reportData.className)?.id || '' : ''}
                onValueChange={handleClassChange}
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </Select>
            </div>
            <div className="col-md-6">
              <Label htmlFor="studentName">Student Name <span className="text-danger">*</span></Label>
              <Select 
                value={reportData.studentId}
                onValueChange={handleStudentChange}
                disabled={!reportData.className}
                required
              >
                <option value="">Select a student</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </Select>
            </div>            <div className="col-md-3">
              <Label htmlFor="academicYear">Academic Year <span className="text-danger">*</span></Label>
              <Select 
                value={selectedYear} 
                onValueChange={handleYearChange}
                required
              >
                <option value="">Select year</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </Select>
            </div>
            <div className="col-md-3">
              <Label htmlFor="academicQuarter">Quarter <span className="text-danger">*</span></Label>
              <Select 
                value={selectedQuarter} 
                onValueChange={handleQuarterChange}
                required
              >
                <option value="">Select quarter</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </Select>
            </div>
            <div className="col-md-6">
              <Label htmlFor="reportType">Report Type <span className="text-danger">*</span></Label>
              <Select 
                value={reportData.reportType} 
                onValueChange={(value) => setReportData({ ...reportData, reportType: value })}
                required
              >
                <option value="">Select report type</option>
                <option value="exam">Exam Report</option>
                <option value="academic">Academic & Cognitive Development Report</option>
                <option value="social">Social & Emotional Development Report</option>
                <option value="physical">Physical & Creative Development Report</option>
              </Select>
            </div>
            
            <div className="col-md-6">
              <Label htmlFor="date">Report Date</Label>
              <Input
                id="date"
                type="date"
                value={reportData.date}
                onChange={(e) => setReportData({ ...reportData, date: e.target.value })}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Report Form Based on Report Type */}
      {reportData.reportType ? (
        <>
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="h4 fw-semibold mb-0">
                {reportData.reportType === 'exam' && 'Exam Report'}
                {reportData.reportType === 'academic' && 'Academic & Cognitive Development Report'}
                {reportData.reportType === 'social' && 'Social & Emotional Development Report'}
                {reportData.reportType === 'physical' && 'Physical & Creative Development Report'}
              </h3>
            </div>
            <div className="card-body">
              {renderReportForm()}
            </div>
          </div>

          {/* Comments & Summary Section */}
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="h4 fw-semibold mb-0">Comments & Summary</h3>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <Label htmlFor="comments"> Comments <span className="text-danger">*</span></Label>
                <Textarea
                  id="comments"
                  value={reportData.comments}
                  onChange={(e) => setReportData({ ...reportData, comments: e.target.value })}
                  placeholder="Enter  comments about the student's performance, behavior, and recommendations..."
                  rows={6}
                  required
                />
              </div>
              
              
            </div>
          </div>
        </>
              ) : (
          <div className="alert alert-warning d-flex align-items-center">
            <BookOpen className="me-2" />
            <h5 className="alert-heading mb-0">Please select a report type</h5>
          </div>
        )}

      {/* Submit Button */}
      {reportData.reportType && (
        <div className="d-flex justify-content-end gap-3">
          <button type="button" className="btn btn-secondary">
            Cancel
          </button>
          <Button type="submit" className="d-flex align-items-center">
          
            Save Report
          </Button>
        </div>
      )}
    </form>
  )
}

export default function KindergartenReportSystem() {
  return (
    <>
      <style>
        {`
          .form-check-input[type="radio"] {
            transform: scale(1.0) !important;
            margin: 0.5rem !important;
            cursor: pointer !important;
            border: 0.5px solid #6c757d !important;
            border-radius: 50% !important;
          }
          .form-check-input[type="radio"]:checked {
            border-color: #0d6efd !important;
            background-color: #0d6efd !important;
          }
        `}
      </style>
      <div className="min-vh-100 bg-light p-4">
        <div className="container max-w-6xl">
          <main className="bg-white rounded shadow p-5">
            <div className="mb-4 d-flex align-items-center justify-content-between">
              <div>
                <h2 className="h3 fw-bold">Kindergarten Report System</h2>
                <p className="text-muted mt-1">
                  Create, edit, and manage student reports with specialized forms for different report types
                </p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>

            <TeacherReportForm />
          </main>

        </div>
      </div>
    </>
  )
}
