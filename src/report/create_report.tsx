"use client"
import React, { useState, useEffect } from 'react'
import { Slot } from "@radix-ui/react-slot"
import * as LabelPrimitive from "@radix-ui/react-label"
import { FileText, BookOpen, Save } from 'lucide-react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
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
  parentId: string
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Prepare report data based on type
      const reportDataToStore: ReportDataToStore = {
        studentId: reportData.studentId,
        parentId: '', // Will be fetched from student data
        type: reportData.reportType,
        term: reportData.academicPeriod,
        createdAt: serverTimestamp(),
        teacherName: reportData.teacherName,
        reportDate: reportData.date,
        data: {}
      }

      // Get parent ID from student data
      const selectedStudent = students.find(s => s.id === reportData.studentId)
      if (selectedStudent) {
        // Assuming parent ID is stored in student data, you may need to adjust this
        reportDataToStore.parentId = selectedStudent.classId // Temporary, adjust based on your data structure
      }

      // Format data based on report type
      switch (reportData.reportType) {
        case 'exam':
          reportDataToStore.data = {
            examType: reportData.academicPeriod,
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
            assessments: academicAssessments
          } as Record<string, unknown>
          break

        case 'social':
          reportDataToStore.data = {
            generalComments: reportData.comments,
            assessments: socialAssessments
          } as Record<string, unknown>
          break

        case 'physical':
          reportDataToStore.data = {
            generalComments: reportData.comments,
            assessments: physicalAssessments
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
      alert('Report saved successfully!')
      
      // Reset form or redirect
      // You can add navigation logic here if needed
      
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
              <Label htmlFor="className">Class</Label>
              <Select 
                value={reportData.className ? classes.find(c => c.name === reportData.className)?.id || '' : ''}
                onValueChange={handleClassChange}
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </Select>
            </div>
            <div className="col-md-6">
              <Label htmlFor="studentName">Student Name</Label>
              <Select 
                value={reportData.studentId}
                onValueChange={handleStudentChange}
                disabled={!reportData.className}
              >
                <option value="">Select a student</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </Select>
            </div>
            <div className="col-md-6">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                value={reportData.studentId}
                placeholder="Student ID (auto-filled)"
                disabled
              />
            </div>
            <div className="col-md-6">
              <Label htmlFor="reportType">Report Type</Label>
              <Select 
                value={reportData.reportType} 
                onValueChange={(value) => setReportData({ ...reportData, reportType: value })}
              >
                <option value="">Select report type</option>
                <option value="exam">Exam Report</option>
                <option value="academic">Academic & Cognitive Development Report</option>
                <option value="social">Social & Emotional Development Report</option>
                <option value="physical">Physical & Creative Development Report</option>
              </Select>
            </div>
            <div className="col-md-6">
              <Label htmlFor="academicPeriod">Academic Period</Label>
              <Select 
                value={reportData.academicPeriod} 
                onValueChange={(value) => setReportData({ ...reportData, academicPeriod: value })}
              >
                <option value="">Select period</option>
                <option value="2024-2025-Q1">2024-2025 Q1</option>
                <option value="2024-2025-Q2">2024-2025 Q2</option>
                <option value="2024-2025-Q3">2024-2025 Q3</option>
                <option value="2024-2025-Q4">2024-2025 Q4</option>
              </Select>
            </div>
            <div className="col-md-6">
              <Label htmlFor="teacherName">Teacher Name</Label>
              <Input
                id="teacherName"
                value={reportData.teacherName}
                placeholder="Teacher name (auto-filled from login)"
                disabled
              />
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
                <Label htmlFor="comments">General Comments</Label>
                <Textarea
                  id="comments"
                  value={reportData.comments}
                  onChange={(e) => setReportData({ ...reportData, comments: e.target.value })}
                  placeholder="Enter general comments about the student's performance, behavior, and recommendations..."
                  rows={6}
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
            <Save className="me-2" />
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

          <footer className="mt-4 d-flex justify-content-between align-items-center text-sm text-muted">
            <span>KinderCare Admin</span>
            <div className="d-flex align-items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Need help with reports?</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
