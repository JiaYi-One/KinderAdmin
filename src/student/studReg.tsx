import React, { ChangeEvent, useState } from "react";
import { Save, UserPlus, Receipt } from "lucide-react";
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs, getDoc, query, where } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";

interface StudentForm {
  studentName: string;
  studentId: string;
  classId: string;
  icNumber: string;
  age: string;
  gender: string;
  address: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  relationship: string;
}

async function generateUniqueStudentId(age: number): Promise<string> {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  
  // Determine age class (A)
  let ageClass: string;
  if (age <= 3) ageClass = "3";
  else if (age === 4) ageClass = "4";
  else if (age === 5) ageClass = "5";
  else if (age === 6) ageClass = "6";
  else ageClass = "3"; // Default for ages outside kindergarten range
  
  // Find the next available counter for this year and age class
  const counter = await getNextCounter(currentYear, ageClass);
  
  // Format: YYK[A][3-digit-counter]
  const studentId = `${currentYear}K${ageClass}${counter.toString().padStart(3, "0")}`;
  
  return studentId;
}

async function getNextCounter(year: string, ageClass: string): Promise<number> {
  try {
    // Query students collection for existing IDs with this year and age class
    const studentsRef = collection(db, "students");
    const querySnapshot = await getDocs(studentsRef);
    
    let maxCounter = 0;
    const pattern = new RegExp(`^${year}K${ageClass}(\\d{3})$`);
    
    querySnapshot.docs.forEach(doc => {
      const studentId = doc.id;
      const match = studentId.match(pattern);
      if (match) {
        const counter = parseInt(match[1]);
        if (counter > maxCounter) {
          maxCounter = counter;
        }
      }
    });
    
    // Return next counter (maxCounter + 1)
    return maxCounter + 1;
  } catch (error) {
    console.error("Error getting next counter:", error);
    return 1; // Start from 001 if error occurs
  }
}

// Malaysian state codes for IC validation
const STATE_CODES = {
  '01': 'Johor', '21': 'Johor', '22': 'Johor', '23': 'Johor', '24': 'Johor',
  '02': 'Kedah', '25': 'Kedah', '26': 'Kedah', '27': 'Kedah',
  '03': 'Kelantan', '28': 'Kelantan', '29': 'Kelantan',
  '04': 'Melaka', '30': 'Melaka',
  '05': 'Negeri Sembilan', '31': 'Negeri Sembilan', '59': 'Negeri Sembilan',
  '06': 'Pahang', '32': 'Pahang', '33': 'Pahang',
  '07': 'Pulau Pinang', '34': 'Pulau Pinang', '35': 'Pulau Pinang',
  '08': 'Perak', '36': 'Perak', '37': 'Perak', '38': 'Perak', '39': 'Perak',
  '09': 'Perlis', '40': 'Perlis',
  '10': 'Selangor', '41': 'Selangor', '42': 'Selangor', '43': 'Selangor', '44': 'Selangor',
  '11': 'Terengganu', '45': 'Terengganu', '46': 'Terengganu',
  '12': 'Sabah', '47': 'Sabah', '48': 'Sabah', '49': 'Sabah',
  '13': 'Sarawak', '50': 'Sarawak', '51': 'Sarawak', '52': 'Sarawak', '53': 'Sarawak',
  '14': 'Wilayah Persekutuan (Kuala Lumpur)', '54': 'Wilayah Persekutuan (Kuala Lumpur)', 
  '55': 'Wilayah Persekutuan (Kuala Lumpur)', '56': 'Wilayah Persekutuan (Kuala Lumpur)', 
  '57': 'Wilayah Persekutuan (Kuala Lumpur)',
  '15': 'Wilayah Persekutuan (Labuan)', '58': 'Wilayah Persekutuan (Labuan)',
  '16': 'Wilayah Persekutuan (Putrajaya)',
  '82': 'Negeri Tidak Diketahui'
};

interface ICValidationResult {
  isValid: boolean;
  age: number;
  gender: string;
  state: string;
  error?: string;
}

function validateICNumber(icNumber: string): ICValidationResult {
  if (!icNumber || icNumber.length !== 14) {
    return {
      isValid: false,
      age: 0,
      gender: '',
      state: '',
      error: 'IC number must be 14 characters long (including hyphens)'
    };
  }

  try {
    // Remove hyphens and extract components
    const cleanIC = icNumber.replace(/-/g, '');
    if (cleanIC.length !== 12) {
      return {
        isValid: false,
        age: 0,
        gender: '',
        state: '',
        error: 'Invalid IC number format'
      };
    }
    
    // Extract components: YYMMDD-XX-XXXX
    const year = parseInt(cleanIC.substring(0, 2));
    const month = parseInt(cleanIC.substring(2, 4));
    const day = parseInt(cleanIC.substring(4, 6));
    const stateCode = cleanIC.substring(6, 8);
    const lastDigit = parseInt(cleanIC.substring(11, 12));
    
    // 1. Validate date (must not be in the future)
    const currentDate = new Date();
    let fullYear = 2000 + year;
    
    // If year is greater than current year, assume it's 1900s
    if (fullYear > currentDate.getFullYear()) {
      fullYear = 1900 + year;
    }
    
    const birthDate = new Date(fullYear, month - 1, day);
    if (birthDate > currentDate) {
      return {
        isValid: false,
        age: 0,
        gender: '',
        state: '',
        error: 'Birth date cannot be in the future'
      };
    }
    
    // 2. Validate state code
    if (!STATE_CODES[stateCode as keyof typeof STATE_CODES]) {
      return {
        isValid: false,
        age: 0,
        gender: '',
        state: '',
        error: 'Invalid state code in IC number'
      };
    }
    
    // 3. Determine gender from last digit
    const gender = lastDigit % 2 === 1 ? 'Male' : 'Female';
    
    // 4. Calculate age
    const age = currentDate.getFullYear() - birthDate.getFullYear();
    
    return {
      isValid: true,
      age: age,
      gender: gender,
      state: STATE_CODES[stateCode as keyof typeof STATE_CODES]
    };
    
  } catch {
    return {
      isValid: false,
      age: 0,
      gender: '',
      state: '',
      error: 'Error processing IC number'
    };
  }
}



function getClassFromAge(age: number): string {
  if (age <= 3) return "3Y";
  if (age === 4) return "4Y";
  if (age === 5) return "5Y";
  if (age === 6) return "6Y";
  return ""; // Return empty string if age doesn't match any class
}

function formatICNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Format as YYMMDD-XX-XXXX
  if (digits.length <= 6) {
    return digits;
  } else if (digits.length <= 8) {
    return `${digits.substring(0, 6)}-${digits.substring(6)}`;
  } else {
    return `${digits.substring(0, 6)}-${digits.substring(6, 8)}-${digits.substring(8, 12)}`;
  }
}

function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters and normalize phone number
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Handle Malaysian phone numbers
  // Convert +60 or 0060 prefix to just the local format
  if (digitsOnly.startsWith('60')) {
    return digitsOnly.substring(2); // Remove country code
  } else if (digitsOnly.startsWith('0')) {
    return digitsOnly.substring(1); // Remove leading 0
  }
  
  return digitsOnly;
}

async function getChildrenNames(studentIds: string[]): Promise<string[]> {
  if (studentIds.length === 0) return [];
  
  try {
    const childrenNames: string[] = [];
    
    for (const studentId of studentIds) {
      const studentDoc = await getDoc(doc(db, "students", studentId));
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        childrenNames.push(studentData.name || studentId);
      }
    }
    
    return childrenNames;
  } catch (error) {
    console.error("Error fetching children names:", error);
    return [];
  }
}

function StudReg() {
  const auth = getAuth();
  const [formData, setFormData] = useState<StudentForm>({
    studentName: "",
    studentId: "",
    icNumber: "",
    age: "",
    gender: "",
    classId: "",
    address: "",
    parentId: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    relationship: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingParent, setExistingParent] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string;
    student_id?: string[];
    childrenNames?: string[];
    relationship?: string;
    matchType?: string;
  } | null>(null);
  const [showExistingParentInfo, setShowExistingParentInfo] = useState(false);
  const [existingParentAcknowledged, setExistingParentAcknowledged] = useState(false);
  const [icError, setIcError] = useState<string>("");

  // Initialize form with unique IDs
  React.useEffect(() => {
    const initializeForm = async () => {
      const studId = await generateUniqueStudentId(0); // Default age 0 for initial load
      setFormData(prev => ({
        ...prev,
        studentId: studId,
        parentId: "P" + studId,
      }));
    };
    initializeForm();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    // Auto-format IC number with hyphens
    if (name === "icNumber") {
      const formattedValue = formatICNumber(value);
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));

      // Validate IC number and extract information
      const validation = validateICNumber(formattedValue);
      
      if (validation.isValid) {
        setIcError("");
        const selectedClass = getClassFromAge(validation.age);
        
        // Generate new student ID based on calculated age
        const generateNewId = async () => {
          const newStudId = await generateUniqueStudentId(validation.age);
          setFormData((prev) => ({
            ...prev,
            age: validation.age.toString(),
            gender: validation.gender,
            classId: selectedClass,
            studentId: newStudId,
            parentId: "P" + newStudId,
          }));
        };
        generateNewId();
      } else {
        setIcError(validation.error || "Invalid IC number");
        setFormData((prev) => ({
          ...prev,
          age: "",
          gender: "",
          classId: "",
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Check for existing parent when parent info changes
    if (name === "parentName" || name === "parentPhone" || name === "parentEmail") {
      // Pass the new values directly since state update is async
      const updatedFormData = { ...formData, [name]: value };
      checkForExistingParent(updatedFormData.parentPhone, updatedFormData.parentEmail);
    }
  };

  const checkForExistingParent = async (phoneValue?: string, emailValue?: string) => {
    // Use passed parameters or fall back to current form data
    const parentPhone = phoneValue || formData.parentPhone;
    const parentEmail = emailValue || formData.parentEmail;

    // Need at least one field to check for existing parent
    const emailTrimmed = parentEmail.trim();
    const phoneTrimmed = parentPhone.trim();

    console.log("Checking for existing parent:", { phoneTrimmed, emailTrimmed });

    if (!emailTrimmed && !phoneTrimmed) {
      setExistingParent(null);
      setShowExistingParentInfo(false);
      return;
    }

    try {
      const parentsRef = collection(db, "parents");
      let foundParent = null;
      let matchType = "";

      // Check for email match first
      if (emailTrimmed) {
        const emailQuery = query(parentsRef, where("email", "==", emailTrimmed));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          const parentDoc = emailSnapshot.docs[0];
          const parentData = parentDoc.data();
          
          // Check if phone also matches (perfect match)
          if (phoneTrimmed && (parentData.phone === phoneTrimmed || 
              normalizePhoneNumber(parentData.phone || '') === normalizePhoneNumber(phoneTrimmed))) {
            matchType = "both";
          } else {
            matchType = "email";
          }
          
          foundParent = {
            doc: parentDoc,
            data: parentData,
            matchType: matchType
          };
        }
      }

      // If no email match found, check for phone match
      if (!foundParent && phoneTrimmed) {
        // First try exact match
        const phoneQuery = query(parentsRef, where("phone", "==", phoneTrimmed));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty) {
          const parentDoc = phoneSnapshot.docs[0];
          const parentData = parentDoc.data();
          
          foundParent = {
            doc: parentDoc,
            data: parentData,
            matchType: "phone"
          };
        } else {
          // If no exact match, try to find phone numbers that match when normalized
          console.log("No exact phone match found, trying normalized matching...");
          const allParentsSnapshot = await getDocs(parentsRef);
          const normalizedInput = normalizePhoneNumber(phoneTrimmed);
          console.log("Normalized input:", normalizedInput);
          
          for (const parentDoc of allParentsSnapshot.docs) {
            const parentData = parentDoc.data();
            const storedPhone = parentData.phone;
            const normalizedStored = normalizePhoneNumber(storedPhone || '');
            
            console.log(`Comparing: stored="${storedPhone}" (normalized: "${normalizedStored}") vs input="${phoneTrimmed}" (normalized: "${normalizedInput}")`);
            
            if (storedPhone && normalizedStored === normalizedInput) {
              console.log("Found normalized phone match!");
              foundParent = {
                doc: parentDoc,
                data: parentData,
                matchType: "phone"
              };
              break;
            }
          }
        }
      }

      if (foundParent) {
        const childrenNames = await getChildrenNames(foundParent.data.student_id || []);

        const existingParentData = {
          id: foundParent.doc.id,
          name: foundParent.data.name,
          phone: foundParent.data.phone,
          email: foundParent.data.email,
          student_id: foundParent.data.student_id,
          childrenNames: childrenNames,
          relationship: foundParent.data.relationship,
          matchType: foundParent.matchType, // Add match type info
        };

        setExistingParent(existingParentData);
        setShowExistingParentInfo(true);
        setExistingParentAcknowledged(false); // Reset acknowledgment for new parent

        // Store the existing parent ID for later use, but don't auto-fill form
        // Let admin verify and modify input if needed
      } else {
        setExistingParent(null);
        setShowExistingParentInfo(false);
      }
    } catch (error) {
      console.error("Error checking for existing parent:", error);
    }
  };

  const fillExistingParentData = async () => {
    if (existingParent) {
      setFormData(prev => ({
        ...prev,
        parentId: existingParent.id,
        parentName: existingParent.name,
        parentPhone: existingParent.phone,
        parentEmail: existingParent.email,
      }));

      // Prefill relationship from one of the existing parent's students, if available
      const firstChildId = existingParent.student_id && existingParent.student_id.length > 0
        ? existingParent.student_id[0]
        : undefined;
      if (firstChildId) {
        try {
          const childDoc = await getDoc(doc(db, "students", firstChildId));
          const childData = childDoc.exists() ? childDoc.data() : undefined;
          const existingRelationship = childData?.relationship as string | undefined;
          if (existingRelationship) {
            setFormData(prev => ({ ...prev, relationship: existingRelationship }));
          }
        } catch (err) {
          console.error("Failed to get existing relationship:", err);
        }
      }

      // Mark as acknowledged and hide the alert
      setExistingParentAcknowledged(true);
      setShowExistingParentInfo(false);
      
     
    }
  };

  const clearParentForm = () => {
    // Only clear parent-related fields, keep student information
    setFormData(prev => ({
      ...prev,
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      relationship: "",
      // Keep the parentId for new parent creation
      parentId: "P" + prev.studentId,
    }));
    
    // Clear existing parent detection
    setExistingParent(null);
    setShowExistingParentInfo(false);
    setExistingParentAcknowledged(false);
  };





  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's an unacknowledged existing parent
    if (showExistingParentInfo && !existingParentAcknowledged) {
      alert("⚠️ Please choose either 'Use Current Parent' or 'Clear Form' before submitting the form.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Derive gender from IC last digit (even=female, odd=male)
      const cleanIC = (formData.icNumber || "").replace(/-/g, "");
      const lastDigitChar = cleanIC.charAt(cleanIC.length - 1);
      const lastDigit = lastDigitChar ? parseInt(lastDigitChar, 10) : NaN;
      const computedGender = !isNaN(lastDigit) && lastDigit % 2 === 0 ? "Female" : "Male";

      let parentId = formData.parentId;
      let isNewParent = false;

      // If we have an existing parent, use it
      if (existingParent && formData.parentId === existingParent.id) {
        parentId = existingParent.id;
        isNewParent = false;
      } else {
        // Check if phone number already exists in Firestore
        const parentsRef = collection(db, "parents");
        const phoneQuery = query(parentsRef, where("phone", "==", formData.parentPhone.trim()));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty) {
          throw new Error(`Phone number ${formData.parentPhone} is already registered. Please use a different phone number.`);
        }

        // Create new parent authentication account
        const defaultPassword = formData.parentId;
        await createUserWithEmailAndPassword(
          auth,
          formData.parentEmail,
          defaultPassword
        );
        isNewParent = true;
      }

      // Create student document in students collection
      const studentDocRef = doc(
        collection(db, "students"),
        formData.studentId
      );
      await setDoc(studentDocRef, {
        name: formData.studentName,
        parentId: parentId,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone,
        relationship: formData.relationship,
        icNumber: formData.icNumber,
        age: formData.age,
        gender: computedGender,
        class_id: formData.classId,
        address: formData.address,
      });

      // Create student document in class's student subcollection
      const classStudentRef = doc(
        collection(db, "classes", formData.classId, "students"),
        formData.studentId
      );
      await setDoc(classStudentRef, {
        name: formData.studentName,
        studentID: formData.studentId,
        parentId: parentId,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        parentPhone: formData.parentPhone,
        relationship: formData.relationship,
        icNumber: formData.icNumber,
        age: formData.age,
        gender: computedGender,
        address: formData.address,
      });

      // Update parent document
      const parentDocRef = doc(collection(db, "parents"), parentId);
      
      if (isNewParent) {
        // Create new parent document
        await setDoc(
          parentDocRef,
          {
            name: formData.parentName,
            parentId: parentId,
            email: formData.parentEmail,
            phone: formData.parentPhone,
            student_id: [formData.studentId],
            role: "parent",
          },
          { merge: true }
        );
      } else {
                 // Update existing parent document to add new student
         const parentDoc = await getDoc(parentDocRef);
                 if (parentDoc.exists()) {
          const parentData = parentDoc.data();
          const existingStudentIds = parentData?.student_id || [];
          
          if (!existingStudentIds.includes(formData.studentId)) {
            await setDoc(
              parentDocRef,
              {
                student_id: [...existingStudentIds, formData.studentId],
              },
              { merge: true }
            );
          }
        }
      }

      const successMessage = isNewParent 
        ? `Registration successful! Parent login created with:\nEmail: ${formData.parentEmail}\nDefault Password: ${formData.parentId}\n\nPlease change your password after first login.`
        : `Registration successful! Student ${formData.studentName} has been added to existing parent account.`;

      alert(successMessage);

      // Reset form with new IDs
      const newStudId = await generateUniqueStudentId(0); // Default age 0 for reset
      setFormData({
        studentName: "",
        studentId: newStudId,
        icNumber: "",
        age: "",
        gender: "",
        classId: "",
        parentId: "P" + newStudId,
        address: "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        relationship: "",
      });
      setExistingParent(null);
      setShowExistingParentInfo(false);
      setExistingParentAcknowledged(false);
    } catch (error: unknown) {
      console.error("Error saving data:", error);
      if (error instanceof Error) {
        if ('code' in error && error.code === 'auth/email-already-in-use') {
          alert("This email is already registered. Please use a different email address.");
        } else if (error.message.includes("Phone number") && error.message.includes("already registered")) {
          alert(error.message);
        } else {
          alert("Error saving data. Please try again.");
        }
      } else {
        alert("Error saving data. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light p-4">
      <div className="container max-w-6xl">
        <main className="bg-white rounded shadow p-5">
          <div className="mb-4 d-flex align-items-center justify-content-between">
            <div>
              <h2 className="h3 fw-bold">New Student Registration</h2>
              <p className="text-muted mt-1">
                Fill in the student's information below
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-primary" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <h3 className="h4 fw-semibold mb-3">Student Information</h3>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label" htmlFor="studentName">
                    Student Name
                  </label>
                  <input
                    type="text"
                    name="studentName"
                    value={formData.studentName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="studentName"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="icNumber">
                    Identity Card Number
                  </label>
                  <input
                    type="text"
                    name="icNumber"
                    value={formData.icNumber}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    placeholder="YYMMDD-XX-XXXX"
                    maxLength={14}
                    required
                    id="icNumber"
                  />
                  <div className="form-text">Enter 14-digit IC number with hyphens (e.g., 150101-01-1234)</div>
                  {icError && (
                    <div className="form-text text-danger">{icError}</div>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="classId">
                    Class
                  </label>
                  <div>
                    <input
                      type="text"
                      name="classId"
                      value={formData.classId || "Auto-selected based on age"}
                      className="form-control bg-light"
                      readOnly
                      id="classId"
                    />
                    <div className="form-text">Automatically selected based on age</div>
                  </div>
                </div>
                <div className="col-md-12">
                  <label className="form-label" htmlFor="address">
                    Home Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    rows={3}
                    required
                    id="address"
                  />
                </div>
              </div>
            </div>

            {/* Parent Information Section */}
            <div className="mb-3">
              <h3 className="h4 fw-semibold mb-3">
                Parent/Guardian Information
              </h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="parentName">
                    Parent/Guardian Name
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="parentName"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="parentPhone">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="parentPhone"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="parentEmail">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="parentEmail"
                    value={formData.parentEmail}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e)
                    }
                    className="form-control"
                    required
                    id="parentEmail"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="relationship">
                    Relationship to Student
                  </label>
                  <div className="row">
                    <div className={formData.relationship === "Other" ? "col-md-6" : "col-md-12"}>
                      <select
                        name="relationship"
                        value={formData.relationship}
                        onChange={handleChange}
                        className="form-select"
                        required
                        disabled={!!(existingParent && formData.parentId === existingParent.id)}
                        id="relationship"
                      >
                        <option value="">Select Relationship</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Grandfather">Grandfather</option>
                        <option value="Grandmother">Grandmother</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {formData.relationship === "Other" && !(existingParent && formData.parentId === existingParent.id) && (
                      <div className="col-md-6">
                        <input
                          type="text"
                          name="relationship"
                          value={formData.relationship === "Other" ? "" : formData.relationship}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setFormData(prev => ({ ...prev, relationship: e.target.value }))
                          }
                          className="form-control"
                          placeholder="e.g., Uncle, Aunt, Legal Guardian"
                          required
                          id="otherRelationship"
                        />
                      </div>
                    )}
                    
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-muted">
                  We'll check for existing parents by email or phone number. If a match is found, we'll show you the existing details for verification. You can modify the input if needed.
                </small>
              </div>
            </div>

            {/* Existing Parent Alert */}
            {showExistingParentInfo && existingParent && (
              <div className="alert alert-warning mb-4">
                <p>
                  <strong>We found an existing parent with matching information. Please verify if the details below are correct:</strong>
                </p>
                <div className="mb-3">
                  <h6>Existing Parent Details:</h6>
                  <ul className="mb-3">
                    <li><strong>Name:</strong> {existingParent.name}</li>
                    <li>
                      <strong>Phone:</strong> {existingParent.phone}
                      
                    </li>
                    <li>
                      <strong>Email:</strong> {existingParent.email}
             
                    </li>
                    <li><strong>Current Students:</strong> {existingParent.student_id?.length || 0}</li>
                    {existingParent.childrenNames && existingParent.childrenNames.length > 0 && (
                      <li>
                        <strong>Existing Children:</strong> {existingParent.childrenNames.join(", ")}
                      </li>
                    )}
                  </ul>
                </div>
                <div className="p-3 rounded">
                  
                  <div className="d-flex justify-content-center gap-3 mt-3">
                    <button 
                      type="button" 
                      className="btn btn-success"
                      onClick={() => fillExistingParentData()}
                    >
                      Use Current Parent
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={() => clearParentForm()}
                    >
                     Clear Form
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="d-flex justify-content-end gap-3 mt-4">
              <button type="button" className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 me-2" />
                {isSubmitting ? "Registering..." : "Register Student"}
              </button>
            </div>
          </form>
        </main>

        <footer className="mt-4 d-flex justify-content-between align-items-center text-sm text-muted">
        
          <div className="d-flex align-items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span>Need help with registration?</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default StudReg;
