<script setup lang="ts">
import { ref, onMounted } from 'vue';
//Component imports
import InputField from '@/components/InputField.vue';
import GridDataField from '@/components/GridDataField.vue';
import GithubStars from '@/components/GithubStars.vue';
import PrivacyToggle from '@/components/PrivacyToggle.vue';
import Explanation from '@/components/Explanation.vue';
import EnterSkill from '@/components/EnterSkill.vue';
import EnterWorkExperience from '@/components/EnterWorkExperience.vue';
// New UI components
import UiButton from '@/components/UiButton.vue';
import UiCard from '@/components/UiCard.vue';
import UiSegment from '@/components/UiSegment.vue';
import UiToggle from '@/components/UiToggle.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
// Excel tracking
import { useExcelTracker } from '@/composables/ExcelTracker';

const tab = ref(0);
const jobs = ref([
  { id: 1, title: 'Senior Frontend Developer', company: 'Apple Inc.', status: 'applied' },
  { id: 2, title: 'Full Stack Engineer', company: 'Google', status: 'interview' },
  { id: 3, title: 'React Developer', company: 'Meta', status: 'saved' }
]);

// Add runtime stability monitoring
onMounted(() => {
  // Add stability classes to prevent shaking during any operations
  const container = document.querySelector('.premium-container');
  if (container) {
    container.classList.add('runtime-stable');
  }
  
  // Monitor for any layout changes and add stability
  const observer = new MutationObserver(() => {
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      if (!el.classList.contains('runtime-stable')) {
        el.classList.add('runtime-stable');
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
});

// Excel tracking functionality
const { 
  applications, 
  addApplication, 
  updateApplicationStatus, 
  updateExcelFile, 
  loadApplications, 
  saveApplications,
  exportToExcel 
} = useExcelTracker();

function saveProfile() {
  // Save profile logic
  console.log('Profile saved');
}

function resetProfile() {
  // Reset profile logic
  console.log('Profile reset');
}

function updateJobStatus(job: any) {
  console.log('Job status updated:', job);
  // Update Excel file when job status changes
  updateExcelFile();
}

function autofillCurrentPage() {
  // Autofill logic
  console.log('Autofilling current page');
  
  // Get current page job information
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // Extract job information from current page
      const jobInfo = extractJobInfoFromPage();
      
      // Add to applications and update Excel
      if (jobInfo) {
        addApplication({
          company: jobInfo.company,
          position: jobInfo.position,
          jobUrl: tabs[0].url || '',
          status: 'Applied',
          location: jobInfo.location,
          salary: jobInfo.salary
        });
      }
    }
  });
}

function clearJobs() {
  jobs.value = [];
  console.log('Jobs cleared');
}

// Function to extract job information from current page
function extractJobInfoFromPage() {
  // This would extract job info from the current page
  // For now, return sample data
  return {
    company: 'Current Company',
    position: 'Current Position',
    location: 'Remote',
    salary: 'Competitive'
  };
}

// Function to manually add a job application
function addJobApplication() {
  const newJob = {
    company: prompt('Company name:') || 'Unknown Company',
    position: prompt('Job position:') || 'Unknown Position',
    location: prompt('Location (optional):') || '',
    salary: prompt('Salary (optional):') || ''
  };
  
  addApplication({
    ...newJob,
    status: 'Applied'
  });
  
  alert('Job application added and Excel file updated!');
}

// Load applications on mount
onMounted(() => {
  loadApplications();
});
</script>


<template>
  <div class="premium-container">
    <!-- Premium Header -->
    <header class="premium-header">
      <div class="header-content">
        <div class="brand-section">
          <div class="logo-container">
            <img src="/icons/mountain.svg" width="32" height="32" alt="Trackr" class="logo" />
          </div>
          <div class="brand-text">
            <h1 class="brand-title">Trackr</h1>
            <p class="brand-subtitle">CAREER NAVIGATION</p>
          </div>
        </div>
        <div class="header-actions">
          <UiSegment :options="['Profile', 'Jobs']" v-model="tab" class="premium-segment" />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Profile Tab -->
    <UiCard v-if="tab === 0" class="tab-content">
      <div class="section">
        <h2 class="h2">Personal Information</h2>
        <div class="form-grid">
          <InputField label="First Name" placeHolder="John" />
          <InputField label="Last Name" placeHolder="Pork" />
          <InputField label="Full Name" placeHolder="John Pork Sr." />
          <InputField label="Email" placeHolder="jpork@mit.edu" />
          <InputField label="Phone" placeHolder="123-345-6789" />
          <InputField label="Phone Type" :placeHolder="[
            'Landline',
            'Mobile',
            'Office Phone'
          ]" />
        </div>
      </div>

      <hr class="sep" />

      <div class="section">
        <h2 class="h2">Experience</h2>
        <InputField label="Resume" placeHolder="No file found"/>
        <GridDataField label="Work Experience" />
        <GridDataField label="Skills" />
        <InputField 
          label="API Key" 
          explanation="The API Key field requires a Gemini-1.5-flash api key. This field is optional and is used to autofill the work experience and skills fields directly from your resume." 
          placeHolder="AIyKwaSyBTOk..." 
        />
      </div>

      <hr class="sep" />

      <div class="section">
        <h2 class="h2">Social Links</h2>
        <div class="form-grid">
          <InputField label="Twitter/X" placeHolder="https://x.com/" />
          <InputField label="LinkedIn" placeHolder="https://linkedin.com/in/johnpork" />
          <InputField label="Github" placeHolder="https://github.com/andrewmillercode" />
          <InputField label="Website" placeHolder="johnpork.com" />
        </div>
      </div>

      <hr class="sep" />

      <div class="section">
        <h2 class="h2">Location</h2>
        <div class="form-grid">
          <InputField label="Street" placeHolder="123 Sesame St" />
          <InputField label="City" placeHolder="Albuquerque" />
          <InputField label="State/Region" placeHolder="New Mexico" />
          <InputField label="Country" placeHolder="United States of America" />
          <InputField label="Postal/Zip Code" placeHolder="87104" />
        </div>
      </div>

      <hr class="sep" />

      <div class="section">
        <h2 class="h2">Education</h2>
        <div class="form-grid">
          <InputField label="School" placeHolder="Massachusetts Institute of Technology" />
          <InputField label="Degree" :placeHolder="[
            'Associate\'s Degree',
            'Bachelor\'s Degree',
            'Doctor of Medicine (M.D.)',
            'Doctor of Philosophy (Ph.D.)',
            'Engineer\'s Degree',
            'High School',
            'Juris Doctor (J.D.)',
            'Master of Business Administration (M.B.A.)',
            'Master\'s Degree',
            'Other'
          ]" />
          <InputField label="Discipline" placeHolder="Computer Science" />
          <InputField label="Start Date Month" :placeHolder="[
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ]" />
          <InputField label="Start Date Year" placeHolder="2024" />
          <InputField label="End Date Month" :placeHolder="[
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ]" />
          <InputField label="End Date Year" placeHolder="2025" />
          <InputField label="GPA" placeHolder="3.94" />
          <InputField label="Current Employer" placeHolder="Apple" />
        </div>
      </div>

      <hr class="sep" />

      <div class="section">
        <h2 class="h2">Voluntary Identification</h2>
        <div class="form-grid">
          <InputField label="Gender" :placeHolder="['Male', 'Female', 'Decline To Self Identify']" />
          <InputField label="Race" :placeHolder="[
            'American Indian or Alaskan Native',
            'Asian',
            'Black or African American',
            'White',
            'Native Hawaiian or Other Pacific Islander',
            'Two or More Races',
            'Decline To Self Identify'
          ]" />
          <InputField label="Hispanic/Latino" :placeHolder="['Yes', 'No', 'Decline To Self Identify']" />
          <InputField label="Veteran Status"
            :placeHolder="['I am not a protected veteran', 'I identify as one or more of the classifications of a protected veteran', 'I don\'t wish to answer']" />
          <InputField label="Disability Status"
            :placeHolder="['Yes, I have a disability, or have had one in the past', 'No, I do not have a disability and have not had one in the past', 'I do not want to answer']" />
        </div>
      </div>

      <div class="actions">
        <UiButton variant="primary" @click="saveProfile">Save Profile</UiButton>
        <UiButton variant="subtle" @click="resetProfile">Reset</UiButton>
      </div>
    </UiCard>

    <!-- Jobs Tab -->
    <UiCard v-else class="tab-content">
      <div class="section">
        <h2 class="h2">Job Applications</h2>
        <p class="p">Track your job applications and their status.</p>
        
        <div class="job-list">
          <div v-for="job in jobs" :key="job.id" class="job-item">
            <div class="job-info">
              <div class="h3">{{ job.title || 'Untitled Position' }}</div>
              <div class="p">{{ job.company || 'Unknown Company' }}</div>
            </div>
            <select v-model="job.status" @change="updateJobStatus(job)" class="status-select">
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div class="actions">
        <UiButton variant="primary" @click="autofillCurrentPage">Autofill Current Page</UiButton>
        <UiButton variant="subtle" @click="addJobApplication">Add Job Application</UiButton>
        <UiButton variant="subtle" @click="exportToExcel">Export to Excel</UiButton>
        <UiButton variant="subtle" @click="clearJobs">Clear All</UiButton>
      </div>
    </UiCard>

    <!-- Footer with additional components -->
    <footer class="footer">
      <EnterWorkExperience/>
      <EnterSkill/>
      <Explanation/>
      <div class="footer-controls">
        <GithubStars/>
        <PrivacyToggle/>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Premium Container - Normal Popup */
.premium-container {
  width: 420px;
  min-height: 600px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  overflow: hidden;
  position: relative;
  contain: layout style paint !important;
  isolation: isolate !important;
  /* No transitions to prevent shaking */
}

/* Premium Header */
.premium-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  padding: var(--space-lg) var(--space-xl);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: var(--blur);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 100%;
  position: relative;
  contain: layout !important;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.brand-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  position: relative;
  contain: layout !important;
  flex-shrink: 0;
}

.logo-container {
  width: 48px;
  height: 48px;
  background: var(--bg-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border-primary);
  box-shadow: var(--shadow);
}

.logo {
  filter: brightness(1.1);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0;
  line-height: var(--line-height-tight);
}

.brand-subtitle {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin: 0;
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Premium Sections */
.section {
  margin-bottom: var(--space-2xl);
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  margin-bottom: var(--space-xl);
}

/* Fix spacing between section title and first field */
.section h2 {
  margin-bottom: var(--space-xl);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.section-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  line-height: var(--line-height-relaxed);
}

/* Premium Form Grid */
.form-grid {
  display: grid;
  gap: var(--space-lg);
  grid-template-columns: 1fr;
}

.form-grid.two-column {
  grid-template-columns: 1fr 1fr;
}

.form-grid.two-column > *:nth-child(odd) {
  grid-column: 1;
  position: relative !important;
  contain: layout !important;
}

.form-grid.two-column > *:nth-child(even) {
  grid-column: 2;
  position: relative !important;
  contain: layout !important;
}

.form-grid.two-column > *:nth-last-child(-n+2):nth-child(odd) {
  grid-column: 1 / -1;
}

/* Premium Separators */
.sep {
  border: 0;
  height: 1px;
  background: var(--border-primary);
  margin: var(--space-2xl) 0;
  opacity: 0.6;
}

/* Premium Actions */
.actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-2xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-primary);
}

/* Premium Job List */
.job-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: var(--space-lg) 0;
}

.job-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border-primary);
  transition: none !important;
}

.job-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-lg);
}

.job-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
}

.job-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.job-company {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.status-select {
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
  padding: 0 var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  min-width: 120px;
  transition: none !important;
}

.status-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
}

/* Premium Footer */
.footer {
  margin-top: var(--space-3xl);
  padding-top: var(--space-2xl);
  border-top: 1px solid var(--border-primary);
}

.footer-controls {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-lg);
}

/* Premium Responsive */
@media (max-width: 480px) {
  .premium-container {
    width: 100vw;
  }
  
  .form-grid.two-column {
    grid-template-columns: 1fr;
  }
  
  .form-grid.two-column > * {
    grid-column: 1 !important;
  }
  
  .header-content {
    flex-direction: column;
    gap: var(--space-lg);
    align-items: stretch;
  }
  
  .brand-section {
    justify-content: center;
  }
}

/* Premium Focus Styles */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Complete motion elimination - absolutely no animations or transitions */
* {
  transition: none !important;
  animation: none !important;
  transform: none !important;
  will-change: auto !important;
  backface-visibility: visible !important;
  perspective: none !important;
  transform-style: flat !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  animation-fill-mode: none !important;
  animation-play-state: paused !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  transition-timing-function: linear !important;
  transition-property: none !important;
}

/* Override any remaining transitions */
.premium-container,
.premium-header,
.card,
.btn,
.seg,
.seg-btn,
.premium-segment,
.theme-toggle,
.logo-container,
.brand-section,
.brand-text,
.brand-title,
.brand-subtitle,
.section,
.section-header,
.section-title,
.section-description,
.form-grid,
.actions,
.job-list,
.job-item,
.job-info,
.job-title,
.job-company,
.status-select,
.footer,
.footer-controls {
  transition: none !important;
  animation: none !important;
  transform: none !important;
  will-change: auto !important;
  backface-visibility: visible !important;
  perspective: none !important;
  transform-style: flat !important;
}

/* Additional flickering prevention */
.premium-container {
  contain: layout style paint !important;
  isolation: isolate !important;
  position: relative !important;
  overflow: hidden !important;
}

/* Force hardware acceleration off to prevent flickering */
* {
  -webkit-transform: none !important;
  -moz-transform: none !important;
  -ms-transform: none !important;
  -o-transform: none !important;
  transform: none !important;
  -webkit-transition: none !important;
  -moz-transition: none !important;
  -ms-transition: none !important;
  -o-transition: none !important;
  transition: none !important;
  -webkit-animation: none !important;
  -moz-animation: none !important;
  -ms-animation: none !important;
  -o-animation: none !important;
  animation: none !important;
}

/* CRITICAL: Fix tab switching stability */
.tab-content {
  position: relative !important;
  contain: layout style paint !important;
  isolation: isolate !important;
  transition: none !important;
  animation: none !important;
  transform: none !important;
  flex-shrink: 0 !important;
  width: 100% !important;
  min-height: 400px !important;
}

/* Fix Vue conditional rendering */
.v-enter-active,
.v-leave-active,
.v-enter-from,
.v-leave-to {
  transition: none !important;
  animation: none !important;
  transform: none !important;
  position: relative !important;
  contain: layout !important;
  flex-shrink: 0 !important;
}

/* Fix theme switching */
[data-theme="dark"] *,
[data-theme="light"] * {
  transition: none !important;
  animation: none !important;
  transform: none !important;
  position: relative !important;
  contain: layout !important;
  flex-shrink: 0 !important;
}
</style>
