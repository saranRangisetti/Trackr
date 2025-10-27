<template>
  <div class="inputFieldDiv">
    <h2 style="align-items: center; display: flex; gap:1rem;">{{ label }} <svg v-if="explanation"
        @click="showExplanation" style='cursor: pointer;' xmlns="http://www.w3.org/2000/svg" height="24px"
        viewBox="0 -960 960 960" width="24px" fill="#5f6368">
        <path
          d="M478-240q21 0 35.5-14.5T528-290q0-21-14.5-35.5T478-340q-21 0-35.5 14.5T428-290q0 21 14.5 35.5T478-240Zm-36-154h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
      </svg></h2>

    <input v-if="!dropDowns.includes(label) && !files.includes(label)" :type="hidden" :placeholder="placeHolder"
      v-model="inputValue" @input="saveData" @focus="onFocus" @blur="onBlur" />
    <div v-if="files.includes(label)" class="inputFieldfileHolder">
      <input v-if="files.includes(label)" type="file" title="" value="" :placeholder="placeHolder"
        @change="saveResume" />
      <h2 v-if="files.includes(label)">{{ inputValue }}</h2>
    </div>

    <select :class=hidden v-if="dropDowns.includes(label)" v-model="inputValue" @change="dropdownPrivacy">

      <option v-for="option in placeHolder" :key="option" :value="option">{{ option }}</option>
    </select>

  </div>
</template>

<script lang="ts">
import { ref, watch } from 'vue';
import { usePrivacy } from '@/composables/Privacy';
import { useExplanation } from '@/composables/Explanation.ts';
import { useResumeDetails } from '@/composables/ResumeDetails';
export default {
  props: ['label', 'placeHolder', 'explanation'],
  data() {
    return {
      dropDowns: ['Gender', 'Hispanic/Latino', 'Veteran Status', 'Disability Status', 'Degree', 'Start Date Month', 'End Date Month', 'Race', 'Phone Type'],
      files: ['Resume']
    };
  },

  setup(props) {
    // Declare a reactive input value using Vue's ref
    const inputValue = ref('');
    // Use the composable
    const { privacy } = usePrivacy();
    const hidden = ref('text');
    const { toggleExplanation, setExplanation } = useExplanation();
    const { loadDetails } = useResumeDetails();
    watch(privacy, (newVal) => {
      hidden.value = newVal ? 'password' : 'text';
    });

    const showExplanation = () => {
      setExplanation(props.explanation);
      toggleExplanation();
    }

    const saveResume = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        // Add stability class to prevent shaking during file operations
        const element = document.querySelector('.inputFieldDiv');
        if (element) {
          element.classList.add('file-operation');
        }
        
        const reader = new FileReader();
        reader.onload = function (e) {
          if (!e.target?.result) return;
          const b64 = (e.target.result as string).split(',')[1];
          chrome.storage.local.set({ [`${props.label + '_name'}`]: file.name }, () => {
            inputValue.value = file.name
            console.log(`${props.label} + _name saved:`, file.name);
          });
          chrome.storage.local.set({ [props.label]: b64 }, () => {
            console.log(`${props.label} saved:`, b64);
          });

          chrome.storage.sync.get('API Key', (key) => {
            key = key['API Key']
            if (key) {
              //parse resume, return skills
              fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({

                    contents: [
                      {
                        parts: [
                          {
                            text: `Parse this resume and extract ALL information. Return a comprehensive JSON object with the following structure:
{
  "personalInfo": {
    "firstName": "string",
    "lastName": "string", 
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "phoneType": "Mobile/Landline/Office Phone"
  },
  "location": {
    "street": "string",
    "city": "string", 
    "state": "string",
    "country": "string",
    "postalCode": "string"
  },
  "education": {
    "school": "string",
    "degree": "string",
    "discipline": "string",
    "startMonth": "string",
    "startYear": "string", 
    "endMonth": "string",
    "endYear": "string",
    "gpa": "string"
  },
  "social": {
    "linkedin": "string",
    "github": "string", 
    "twitter": "string",
    "website": "string"
  },
  "skills": ["string array"],
  "experiences": [
    {
      "jobTitle": "string",
      "jobEmployer": "string", 
      "jobDuration": "mm/yy-mm/yy",
      "isCurrentEmployer": boolean,
      "roleBulletsString": "string"
    }
  ],
  "currentEmployer": "string"
}

Extract ALL available information from the resume. If a field is not found, use empty string or null. Be thorough and accurate.`,
                          },
                          {
                            'inline_data': {
                              data: b64,
                              'mime_type': 'application/pdf',
                            }
                          }
                        ]
                      },
                    ]


                  })
                }

              ).then((response) => response.json())
                .then((json) => {
                  console.log(json);
                  let res = json.candidates[0].content.parts[0].text;
                  res = res.replace(/```json/, "").replace(/```/, "").replace('\n', " ").trim();
                  
                  // Parse the comprehensive resume data
                  const resumeData = JSON.parse(res);
                  console.log('Parsed resume data:', resumeData);
                  
                  // Save the comprehensive data
                  chrome.storage.local.set({ [`${props.label + '_details'}`]: res }, () => {
                    console.log(`${props.label} saved:`, res);
                    loadDetails(); //pass details over to others
                  });

                  // Auto-populate all form fields with extracted data
                  populateFormFields(resumeData);
                  
                  // Remove stability class after all operations complete
                  if (element) {
                    element.classList.remove('file-operation');
                  }

                }).catch(e => {
                  console.error(e);
                  // Remove stability class even on error
                  if (element) {
                    element.classList.remove('file-operation');
                  }
                });
            }
          });
        };
        reader.readAsDataURL(file);
      }
    };
    const saveData = () => {
      // Add stability class to prevent shaking during storage operations
      const element = document.querySelector('.inputFieldDiv');
      if (element) {
        element.classList.add('storage-operation');
      }
      
      // Store the value of the input field in chrome storage
      chrome.storage.sync.set({ [props.label]: inputValue.value }, () => {
        console.log(`${props.label} saved:`, inputValue.value);
        // Remove stability class after storage completes
        if (element) {
          element.classList.remove('storage-operation');
        }
      });
    };
    const loadData = () => {
      if (!chrome.storage) return;
      
      // Add stability class to prevent shaking during storage operations
      const element = document.querySelector('.inputFieldDiv');
      if (element) {
        element.classList.add('storage-operation');
      }
      
      chrome.storage.sync.get([props.label], (data) => {

        inputValue.value = data[props.label] || '';  // Default to empty string if no value is found
        if (inputValue.value == '' && props.label === "Resume") {
          chrome.storage.local.get([`${props.label + '_name'}`], (data) => {

            inputValue.value = data[`${props.label + '_name'}`] || 'No file found';  // Default to empty string if no value is found
            // Remove stability class after storage completes
            if (element) {
              element.classList.remove('storage-operation');
            }
          });
        } else {
          // Remove stability class after storage completes
          if (element) {
            element.classList.remove('storage-operation');
          }
        }
      });
    };
    const onFocus = () => {
      if (privacy.value) hidden.value = "text";

    };
    const onBlur = () => {
      if (privacy.value) hidden.value = "password";

    };
    const dropdownPrivacy = () => {
      saveData();
      if (privacy.value) onBlur();
    }

    // Function to populate all form fields with extracted resume data
    const populateFormFields = (resumeData: any) => {
      console.log('Populating form fields with:', resumeData);
      
      // Personal Information
      if (resumeData.personalInfo) {
        const { firstName, lastName, fullName, email, phone, phoneType } = resumeData.personalInfo;
        if (firstName) chrome.storage.sync.set({ 'First Name': firstName });
        if (lastName) chrome.storage.sync.set({ 'Last Name': lastName });
        if (fullName) chrome.storage.sync.set({ 'Full Name': fullName });
        if (email) chrome.storage.sync.set({ 'Email': email });
        if (phone) chrome.storage.sync.set({ 'Phone': phone });
        if (phoneType) chrome.storage.sync.set({ 'Phone Type': phoneType });
      }

      // Location Information
      if (resumeData.location) {
        const { street, city, state, country, postalCode } = resumeData.location;
        if (street) chrome.storage.sync.set({ 'Location (Street)': street });
        if (city) chrome.storage.sync.set({ 'Location (City)': city });
        if (state) chrome.storage.sync.set({ 'Location (State/Region)': state });
        if (country) chrome.storage.sync.set({ 'Location (Country)': country });
        if (postalCode) chrome.storage.sync.set({ 'Postal/Zip Code': postalCode });
      }

      // Education Information
      if (resumeData.education) {
        const { school, degree, discipline, startMonth, startYear, endMonth, endYear, gpa } = resumeData.education;
        if (school) chrome.storage.sync.set({ 'School': school });
        if (degree) chrome.storage.sync.set({ 'Degree': degree });
        if (discipline) chrome.storage.sync.set({ 'Discipline': discipline });
        if (startMonth) chrome.storage.sync.set({ 'Start Date Month': startMonth });
        if (startYear) chrome.storage.sync.set({ 'Start Date Year': startYear });
        if (endMonth) chrome.storage.sync.set({ 'End Date Month': endMonth });
        if (endYear) chrome.storage.sync.set({ 'End Date Year': endYear });
        if (gpa) chrome.storage.sync.set({ 'GPA': gpa });
      }

      // Social Links
      if (resumeData.social) {
        const { linkedin, github, twitter, website } = resumeData.social;
        if (linkedin) chrome.storage.sync.set({ 'LinkedIn': linkedin });
        if (github) chrome.storage.sync.set({ 'Github': github });
        if (twitter) chrome.storage.sync.set({ 'Twitter/X': twitter });
        if (website) chrome.storage.sync.set({ 'Website': website });
      }

      // Current Employer
      if (resumeData.currentEmployer) {
        chrome.storage.sync.set({ 'Current Employer': resumeData.currentEmployer });
      }

      console.log('All form fields populated successfully!');
    };

    // Load data when the component is mounted
    loadData();

    return {
      inputValue,
      saveData,
      saveResume,
      hidden,
      onFocus,
      onBlur,
      dropdownPrivacy,
      showExplanation,
      populateFormFields
    };
  },
};
</script>

<style scoped>
/* Anti-flicker protection for InputField */
.inputFieldDiv {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}

.inputFieldDiv * {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}

.inputFieldfileHolder {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}

input, select {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}
</style>