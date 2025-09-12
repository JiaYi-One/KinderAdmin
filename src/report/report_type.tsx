import React from 'react'
import { Trash2, Plus } from 'lucide-react'

// Interfaces
interface Subject {
  name: string
  grade: string
  comments: string
}

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

interface ReportTypeProps {
  reportData: ReportData
  setReportData: React.Dispatch<React.SetStateAction<ReportData>>
  academicAssessments: Record<string, string>
  setAcademicAssessments: React.Dispatch<React.SetStateAction<Record<string, string>>>
  socialAssessments: Record<string, string>
  setSocialAssessments: React.Dispatch<React.SetStateAction<Record<string, string>>>
  physicalAssessments: Record<string, string>
  setPhysicalAssessments: React.Dispatch<React.SetStateAction<Record<string, string>>>
  handleSubjectChange: (index: number, field: keyof Subject, value: string) => void
  handleDeleteSubject: (index: number) => void
  handleAddSubject: () => void
  getGradeDescription: (grade: string) => string
}

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
    const Comp = asChild ? "button" : "button"
    
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
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("form-label", className)}
    {...props}
  />
))
Label.displayName = "Label"

// Select Component
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

// Generic Assessment Components
interface AssessmentTableProps {
  skills: Array<{
    name: string
    key: string
  }>
  assessments: Record<string, string>
  onAssessmentChange: (skillName: string, value: string) => void
  namePrefix: string
}

const AssessmentTable: React.FC<AssessmentTableProps> = ({
  skills,
  assessments,
  onAssessmentChange,
  namePrefix
}) => {
  return (
    <div className="table-responsive">
      <table className="table table-bordered">
        <thead>
          <tr>
            <th className="col-6">Skill Area</th>
            <th className="text-center">Excellent</th>
            <th className="text-center">Satisfactory</th>
            <th className="text-center">Needs Support</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr key={skill.key}>
              <td>{skill.name}</td>
              <td className="text-center">
                <input 
                  type="radio" 
                  name={`${namePrefix}_${skill.key}`}
                  value="excellent" 
                  className="form-check-input"
                  checked={assessments[skill.key] === 'excellent'}
                  onChange={() => onAssessmentChange(skill.key, 'excellent')}
                />
              </td>
              <td className="text-center">
                <input 
                  type="radio" 
                  name={`${namePrefix}_${skill.key}`}
                  value="satisfactory" 
                  className="form-check-input"
                  checked={assessments[skill.key] === 'satisfactory'}
                  onChange={() => onAssessmentChange(skill.key, 'satisfactory')}
                />
              </td>
              <td className="text-center">
                <input 
                  type="radio" 
                  name={`${namePrefix}_${skill.key}`}
                  value="needs_support" 
                  className="form-check-input"
                  checked={assessments[skill.key] === 'needs_support'}
                  onChange={() => onAssessmentChange(skill.key, 'needs_support')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface AssessmentSectionProps {
  title: string
  skills: Array<{
    name: string
    key: string
  }>
  assessments: Record<string, string>
  onAssessmentChange: (skillName: string, value: string) => void
  namePrefix: string
}

const AssessmentSection: React.FC<AssessmentSectionProps> = ({
  title,
  skills,
  assessments,
  onAssessmentChange,
  namePrefix
}) => {
  return (
    <div className="mb-4">
      <h5 className="fw-semibold mb-3">{title}</h5>
      <AssessmentTable
        skills={skills}
        assessments={assessments}
        onAssessmentChange={onAssessmentChange}
        namePrefix={namePrefix}
      />
    </div>
  )
}

// Skill Data Constants
const ACADEMIC_SKILLS = {
  speaking: [
    { name: 'Expresses thoughts clearly', key: 'thoughts' },
    { name: 'Uses appropriate vocabulary', key: 'vocabulary' },
    { name: 'Follows verbal instructions', key: 'instructions' },
    { name: 'Participates in group discussions', key: 'discussions' },
    { name: 'Asks questions appropriately', key: 'questions' }
  ],
  literacy: [
    { name: 'Recognizes uppercase letters', key: 'uppercase' },
    { name: 'Recognizes lowercase letters', key: 'lowercase' },
    { name: 'Identifies letter sounds', key: 'sounds' },
    { name: 'Shows interest in books/stories', key: 'books' },
    { name: 'Attempts to write letters/words', key: 'writing' }
  ],
  numbers: [
    { name: 'Recognizes numbers 1-10', key: 'numbers' },
    { name: 'Counts objects to 10', key: 'counting' },
    { name: 'Understands more/less concepts', key: 'concepts' },
    { name: 'Simple addition/subtraction', key: 'operations' }
  ],
  shapes: [
    { name: 'Identifies basic shapes', key: 'basic' },
    { name: 'Recognizes colors', key: 'colors' },
    { name: 'Creates and extends patterns', key: 'patterns' },
    { name: 'Sorts objects by attributes', key: 'sorting' }
  ],
  cognitive: [
    { name: 'Solves simple problems', key: 'problems' },
    { name: 'Maintains attention to tasks', key: 'attention' },
    { name: 'Remembers instructions', key: 'memory' },
    { name: 'Makes connections between ideas', key: 'connections' },
    { name: 'Shows curiosity and asks questions', key: 'curiosity' }
  ],
  learning: [
    { name: 'Completes assigned tasks', key: 'tasks' },
    { name: 'Works independently', key: 'independent' },
    { name: 'Seeks help when needed', key: 'help' },
    { name: 'Shows persistence with challenges', key: 'persistence' },
    { name: 'Takes care of materials', key: 'materials' }
  ]
}

const SOCIAL_SKILLS = {
  peer: [
    { name: 'Plays cooperatively with others', key: 'cooperative' },
    { name: 'Shares toys and materials', key: 'shares' },
    { name: 'Takes turns appropriately', key: 'turns' },
    { name: 'Shows kindness to classmates', key: 'kindness' },
    { name: 'Includes others in play', key: 'includes' }
  ],
  communication: [
    { name: 'Uses words to solve problems', key: 'words' },
    { name: 'Listens to others\' ideas', key: 'listens' },
    { name: 'Asks for help appropriately', key: 'help' },
    { name: 'Accepts compromises', key: 'compromises' }
  ],
  self: [
    { name: 'Identifies own feelings', key: 'feelings' },
    { name: 'Shows self-confidence', key: 'confidence' },
    { name: 'Expresses needs clearly', key: 'needs' },
    { name: 'Shows pride in accomplishments', key: 'pride' }
  ],
  regulation: [
    { name: 'Manages frustration appropriately', key: 'frustration' },
    { name: 'Calms down when upset', key: 'calms' },
    { name: 'Shows empathy for others', key: 'empathy' },
    { name: 'Handles transitions well', key: 'transitions' }
  ],
  rules: [
    { name: 'Follows classroom rules', key: 'classroom' },
    { name: 'Follows daily routines', key: 'routines' },
    { name: 'Listens during group time', key: 'listens' },
    { name: 'Raises hand to speak', key: 'hand' },
    { name: 'Respects classroom materials', key: 'materials' }
  ],
  control: [
    { name: 'Waits for turn to speak', key: 'turn' },
    { name: 'Keeps hands to self', key: 'hands' },
    { name: 'Cleans up after activities', key: 'cleanup' },
    { name: 'Takes responsibility for actions', key: 'responsibility' }
  ],
  adults: [
    { name: 'Shows respect for teachers', key: 'respect' },
    { name: 'Follows adult directions', key: 'directions' },
    { name: 'Seeks adult help when needed', key: 'help' },
    { name: 'Shows comfort with school adults', key: 'comfort' }
  ]
}

const PHYSICAL_SKILLS = {
  gross: [
    { name: 'Runs with coordination', key: 'runs' },
    { name: 'Jumps and hops appropriately', key: 'jumps' },
    { name: 'Climbs playground equipment safely', key: 'climbs' },
    { name: 'Balances on one foot', key: 'balance' },
    { name: 'Catches and throws balls', key: 'balls' },
    { name: 'Participates actively in PE/movement', key: 'pe' }
  ],
  fine: [
    { name: 'Holds pencil/crayon correctly', key: 'pencil' },
    { name: 'Cuts with scissors accurately', key: 'scissors' },
    { name: 'Draws recognizable shapes/figures', key: 'draws' },
    { name: 'Uses glue and small tools properly', key: 'tools' },
    { name: 'Manipulates small objects (beads, blocks)', key: 'manipulates' },
    { name: 'Shows hand-eye coordination', key: 'coordination' }
  ],
  care: [
    { name: 'Manages clothing (buttons, zippers)', key: 'clothing' },
    { name: 'Uses bathroom independently', key: 'bathroom' },
    { name: 'Washes hands properly', key: 'hands' },
    { name: 'Handles lunch/snack independently', key: 'lunch' }
  ]
}

// Report Type Components
export const ExamReportForm: React.FC<ReportTypeProps> = ({
  reportData,
  setReportData,
  handleSubjectChange,
  handleDeleteSubject,
  handleAddSubject,
  getGradeDescription
}) => {
  return (
    <>
      {/* Exam Report - Exam-specific assessment */}
      <div className="mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <Label htmlFor="examType">Exam Type <span className="text-danger">*</span></Label>
            <Select 
              value={reportData.examType} 
              onValueChange={(value) => setReportData({ ...reportData, examType: value })}
              required
            >
              <option value="">Select exam type</option>
              <option value="midterm">Midterm Exam</option>
              <option value="final">Final Exam</option>
         
            </Select>
          </div>
        </div>
      </div>

      {/* Subjects & Grades Section */}
      <div className="mb-4" data-subjects-section>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="h5 fw-semibold mb-0">Subjects & Grades <span className="text-danger">*</span></h4>
        </div>
        
        <Card>
          <CardContent>
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <Label className="fw-semibold">Subject <span className="text-danger">*</span></Label>
              </div>
              <div className="col-md-4">
                <Label className="fw-semibold">Score <span className="text-danger">*</span></Label>
              </div>
              <div className="col-md-4">
                <Label className="fw-semibold">Grade</Label>
              </div>
            </div>
            
            {reportData.subjects.map((subject, index) => (
              <div key={index} className="row g-3 mb-2">
                <div className="col-md-4">
                  <Input
                    value={subject.name}
                    onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                    placeholder="Subject name"
                    required={index === 0} // Only first subject is required
                  />
                </div>
                <div className="col-md-4">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={subject.comments}
                    onChange={(e) => handleSubjectChange(index, 'comments', e.target.value)}
                    placeholder="Score (0-100)"
                    required={index === 0} // Only first subject is required
                  />
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center">
                    <Input
                      value={subject.grade ? `${subject.grade} (${getGradeDescription(subject.grade)})` : ''}
                      placeholder="Grade"
                      readOnly
                      className="form-control me-2"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSubject(index)}
                      className="d-flex align-items-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="d-flex justify-content-end mt-3">
              <Button
                type="button"
                variant="default"
                onClick={handleAddSubject}
                className="d-flex align-items-center"
              >
                <Plus className="w-4 h-4 me-1" />
                Add Subject
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export const AcademicDevelopmentForm: React.FC<ReportTypeProps> = ({
  academicAssessments,
  setAcademicAssessments
}) => {
  const handleAcademicAssessment = (skillName: string, value: string) => {
    setAcademicAssessments(prev => ({ ...prev, [skillName]: value }))
  }

  return (
    <>
      {/* Academic & Cognitive Development Report */}
      <div className="alert alert-info mb-4">
        <strong>Note:</strong> At least one complete section must be fully filled to submit this report (all skills in that section must be assessed). Sections marked with <span className="text-danger">*</span> are required.
      </div>
      
      <div className="mb-4">
        
        {/* Language & Communication Skills */}
        <Card className="mb-4" data-section="academic-language">
          <CardHeader>
            <CardTitle>LANGUAGE & COMMUNICATION SKILLS <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentSection
              title="Speaking & Listening"
              skills={ACADEMIC_SKILLS.speaking}
              assessments={academicAssessments}
              onAssessmentChange={handleAcademicAssessment}
              namePrefix="speaking"
            />
            <AssessmentSection
              title="Early Literacy"
              skills={ACADEMIC_SKILLS.literacy}
              assessments={academicAssessments}
              onAssessmentChange={handleAcademicAssessment}
              namePrefix="literacy"
            />
          </CardContent>
        </Card>

        {/* Mathematical Thinking */}
        <Card className="mb-4" data-section="academic-math">
          <CardHeader>
            <CardTitle>MATHEMATICAL THINKING <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentSection
              title="Number Concepts"
              skills={ACADEMIC_SKILLS.numbers}
              assessments={academicAssessments}
              onAssessmentChange={handleAcademicAssessment}
              namePrefix="math"
            />
            <AssessmentSection
              title="Shapes & Patterns"
              skills={ACADEMIC_SKILLS.shapes}
              assessments={academicAssessments}
              onAssessmentChange={handleAcademicAssessment}
              namePrefix="shapes"
            />
          </CardContent>
        </Card>

        {/* Cognitive Skills */}
        <Card className="mb-4" data-section="academic-cognitive">
          <CardHeader>
            <CardTitle>COGNITIVE SKILLS <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentTable
              skills={ACADEMIC_SKILLS.cognitive}
              assessments={academicAssessments}
              onAssessmentChange={handleAcademicAssessment}
              namePrefix="cognitive"
            />
          </CardContent>
        </Card>

        {/* Learning Habits */}
        <Card className="mb-4" data-section="academic-learning">
          <CardHeader>
            <CardTitle>LEARNING HABITS <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentTable
              skills={ACADEMIC_SKILLS.learning}
              assessments={academicAssessments}
              onAssessmentChange={handleAcademicAssessment}
              namePrefix="learning"
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export const SocialEmotionalForm: React.FC<ReportTypeProps> = ({
  socialAssessments,
  setSocialAssessments
}) => {
  const handleSocialAssessment = (skillName: string, value: string) => {
    setSocialAssessments(prev => ({ ...prev, [skillName]: value }))
  }

  return (
    <>
      {/* Social & Emotional Development Report */}
      <div className="alert alert-info mb-4">
        <strong>Note:</strong> At least one complete section must be fully filled to submit this report (all skills in that section must be assessed). Sections marked with <span className="text-danger">*</span> are required.
      </div>
      
      <div className="mb-4">
        
        {/* Social Skills */}
        <Card className="mb-4" data-section="social-skills">
          <CardHeader>
            <CardTitle>SOCIAL SKILLS <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentSection
              title="Peer Interactions"
              skills={SOCIAL_SKILLS.peer}
              assessments={socialAssessments}
              onAssessmentChange={handleSocialAssessment}
              namePrefix="peer"
            />
            <AssessmentSection
              title="Communication & Conflict Resolution"
              skills={SOCIAL_SKILLS.communication}
              assessments={socialAssessments}
              onAssessmentChange={handleSocialAssessment}
              namePrefix="comm"
            />
          </CardContent>
        </Card>

        {/* Emotional Development */}
        <Card className="mb-4" data-section="social-emotional">
          <CardHeader>
            <CardTitle>EMOTIONAL DEVELOPMENT <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentSection
              title="Self-Awareness"
              skills={SOCIAL_SKILLS.self}
              assessments={socialAssessments}
              onAssessmentChange={handleSocialAssessment}
              namePrefix="self"
            />
            <AssessmentSection
              title="Emotional Regulation"
              skills={SOCIAL_SKILLS.regulation}
              assessments={socialAssessments}
              onAssessmentChange={handleSocialAssessment}
              namePrefix="reg"
            />
          </CardContent>
        </Card>

        {/* Behavior & Classroom Conduct */}
        <Card className="mb-4" data-section="social-behavior">
          <CardHeader>
            <CardTitle>BEHAVIOR & CLASSROOM CONDUCT <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentSection
              title="Following Rules & Routines"
              skills={SOCIAL_SKILLS.rules}
              assessments={socialAssessments}
              onAssessmentChange={handleSocialAssessment}
              namePrefix="rules"
            />
            <AssessmentSection
              title="Self-Control & Responsibility"
              skills={SOCIAL_SKILLS.control}
              assessments={socialAssessments}
              onAssessmentChange={handleSocialAssessment}
              namePrefix="control"
            />
          </CardContent>
        </Card>

        {/* Relationship with Adults */}
        <Card className="mb-4" data-section="social-adults">
          <CardHeader>
            <CardTitle>RELATIONSHIP WITH ADULTS <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentTable
              skills={SOCIAL_SKILLS.adults}
              assessments={socialAssessments}
              onAssessmentChange={handleSocialAssessment}
              namePrefix="adult"
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export const PhysicalCreativeForm: React.FC<ReportTypeProps> = ({
  physicalAssessments,
  setPhysicalAssessments
}) => {
  const handlePhysicalAssessment = (skillName: string, value: string) => {
    setPhysicalAssessments(prev => ({ ...prev, [skillName]: value }))
  }

  return (
    <>
      {/* Physical & Creative Development Report */}
      <div className="alert alert-info mb-4">
        <strong>Note:</strong> At least one complete section must be fully filled to submit this report (all skills in that section must be assessed). Sections marked with <span className="text-danger">*</span> are required.
      </div>
      
      <div className="mb-4">
        
        {/* Physical Development */}
        <Card className="mb-4" data-section="physical-development">
          <CardHeader>
            <CardTitle>PHYSICAL DEVELOPMENT <span className="text-danger">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentSection
              title="Gross Motor Skills"
              skills={PHYSICAL_SKILLS.gross}
              assessments={physicalAssessments}
              onAssessmentChange={handlePhysicalAssessment}
              namePrefix="gross"
            />
            <AssessmentSection
              title="Fine Motor Skills"
              skills={PHYSICAL_SKILLS.fine}
              assessments={physicalAssessments}
              onAssessmentChange={handlePhysicalAssessment}
              namePrefix="fine"
            />
            <AssessmentSection
              title="Self-Care & Independence"
              skills={PHYSICAL_SKILLS.care}
              assessments={physicalAssessments}
              onAssessmentChange={handlePhysicalAssessment}
              namePrefix="care"
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export const DefaultForm: React.FC = () => {
  return (
    <div className="alert alert-info">
      <h5>Please select a report type to see the specific form</h5>
      <p>Different report types have different assessment criteria and fields.</p>
    </div>
  )
} 