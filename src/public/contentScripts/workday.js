function getCurStageWorkday(form) {
  if (!form) return null;
  
  // Try multiple selectors for progress bar
  let progressBar = form.querySelector('[data-automation-id="progressBar"]') ||
                   form.querySelector('[data-automation-id="progress-bar"]') ||
                   form.querySelector('.progress-bar') ||
                   form.querySelector('[role="progressbar"]') ||
                   form.querySelector('[data-automation-id="progressIndicator"]');
  
  if (!progressBar) {
    // Try to detect stage from page content with more specific selectors
    let stageIndicators = [
      'My Information',
      'My Experience', 
      'Voluntary Disclosures',
      'Self Identify',
      'Additional Information',
      'Review',
      'Submit',
      'Personal Information',
      'Work Experience',
      'Education',
      'Skills',
      'References',
      'Cover Letter'
    ];
    
    // Check for stage indicators in headings and form sections
    let headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    for (let heading of headings) {
      let headingText = heading.textContent.trim();
      for (let stage of stageIndicators) {
        if (headingText.includes(stage)) {
          return stage;
        }
      }
    }
    
    // Fallback to body content search
    for (let stage of stageIndicators) {
      if (document.body.textContent.includes(stage)) {
        return stage;
      }
    }
    return null;
  }
  
  let curStep = progressBar.querySelector(
    '[data-automation-id="progressBarActiveStep"]'
  ) || progressBar.querySelector('.active') || 
     progressBar.querySelector('.current') ||
     progressBar.querySelector('[aria-current="step"]');
  
  if (curStep) {
    return curStep.children[2]?.textContent ?? 
           curStep.textContent?.trim() ?? 
           curStep.getAttribute('aria-label')?.trim() ?? null;
  }
  
  return null;
}

function workdayQuery(jobParam, form, type) {
  let normalizedParam = jobParam.toLowerCase();
  let inputElement = Array.from(form.querySelectorAll(type)).find((input) => {
    const attributes = [
      input.id?.toLowerCase().trim(),
      input.name?.toLowerCase().trim(),
      input.getAttribute("data-automation-id")?.toLowerCase().trim(),
      input.getAttribute("data-automation-label")?.toLowerCase().trim(),
      input.getAttribute("aria-label")?.toLowerCase().trim(),
      input.getAttribute("placeholder")?.toLowerCase().trim(),
      input.getAttribute("title")?.toLowerCase().trim(),
    ];

    for (let i = 0; i < attributes.length; i++) {
      if (
        attributes[i] != undefined &&
        attributes[i].includes(normalizedParam) &&
        !attributes[i].includes("phonecode") &&
        !attributes[i].includes("countrycode")
      ) {
        return true;
      }
    }
    return false;
  });
  return inputElement;
}
function workdayQueryAll(jobParam, form, type) {
  let normalizedParam = jobParam.toLowerCase();
  let res = [];

  Array.from(form.querySelectorAll(type)).forEach((input) => {
    const attributes = [
      input.id?.toLowerCase().trim(),
      input.name?.toLowerCase().trim(),
      input.getAttribute("data-automation-id")?.toLowerCase().trim(),
      input.getAttribute("data-automation-label")?.toLowerCase().trim(),
      input.getAttribute("aria-label")?.toLowerCase().trim(),
      input.getAttribute("placeholder")?.toLowerCase().trim(),
      input.getAttribute("title")?.toLowerCase().trim(),
    ];
    for (let i = 0; i < attributes.length; i++) {
      if (
        attributes[i] &&
        attributes[i].includes(normalizedParam) &&
        !attributes[i].includes("phonecode") &&
        !attributes[i].includes("countrycode")
      ) {
        res.push(input);
        break;
      }
    }
  });

  return res;
}
async function workDayAutofill(res) {
  console.log("Trackr: Starting Workday autofill...");
  await sleep(delays.initial);

  let wrkDayFields = Object.assign({}, fields.workday);
  let curInstanceCompleted = true;
  let retryCount = 0;
  const maxRetries = 3;
  
  const observer = new MutationObserver(async () => {
    let curStage = getCurStageWorkday(document);
    console.log("Trackr: Current Workday stage:", curStage);
    
    if (curStage && wrkDayFields[curStage] && curInstanceCompleted) {
      curInstanceCompleted = false;
      console.log("Trackr: Processing stage:", curStage);
      
      // Wait for form to be fully loaded
      await sleep(2000);
      
      // Retry logic for better reliability
      let stageCompleted = false;
      while (!stageCompleted && retryCount < maxRetries) {
        try {
          for (let jobParam in wrkDayFields[curStage]) {
            console.log("Trackr: Processing field:", jobParam, "->", wrkDayFields[curStage][jobParam]);
            //gets param from user data
            const param = wrkDayFields[curStage][jobParam];

        if (param === "Resume") {
          let resume = await handleResume(jobParam);
          if (resume) {
            delete wrkDayFields[curStage][jobParam];
            continue;
          }
        }
        if (param === "Skills") {
          let skills = await handleSkills();
          if (skills) {
            delete wrkDayFields[curStage][jobParam];
            continue;
          }
        }
        if (param === "Work Experience") {
          //initial click
          let workExp = await handleWorkExperience(jobParam);
          if (workExp) {
            delete wrkDayFields[curStage][jobParam];
            continue;
          }
        }

        let fillValue = res[param];
        if (!fillValue) {
          //no user data found for parameter
          delete wrkDayFields[curStage][jobParam];
          continue;
        }

        let inputElement = await handleInputElement(
          workdayQuery(jobParam, document, "input"),
          jobParam,
          param,
          fillValue
        );
        if (inputElement) {
          delete wrkDayFields[curStage][jobParam];
          continue;
        }

        // Try textarea fields
        let textareaElement = await handleTextareaElement(
          workdayQuery(jobParam, document, "textarea"),
          jobParam,
          param,
          fillValue
        );
        if (textareaElement) {
          delete wrkDayFields[curStage][jobParam];
          continue;
        }

        // Try select fields
        let selectElement = await handleSelectElement(
          workdayQuery(jobParam, document, "select"),
          jobParam,
          param,
          fillValue
        );
        if (selectElement) {
          delete wrkDayFields[curStage][jobParam];
          continue;
        }

        let dropdown = await handleDropdownElement(
          workdayQuery(jobParam, document, "button"),
          fillValue
        );
        if (dropdown) {
          delete wrkDayFields[curStage][jobParam];
          continue;
        }

            //no element found
            delete wrkDayFields[curStage][jobParam];
          }
          
          stageCompleted = true;
          retryCount = 0; // Reset retry count on success
          
        } catch (error) {
          console.log("Trackr: Error processing stage, retrying...", error);
          retryCount++;
          await sleep(1000 * retryCount); // Exponential backoff
        }
      }
      
      if (retryCount >= maxRetries) {
        console.log("Trackr: Max retries reached for stage:", curStage);
        retryCount = 0; // Reset for next stage
      }
      
      curInstanceCompleted = true;
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}


async function handleResume(jobParam) {
  let inputElement = workdayQuery(jobParam, document, "input");
  const localData = await getStorageDataLocal();
  if (localData.Resume && inputElement) {
    const dt = new DataTransfer();
    let arrBfr = base64ToArrayBuffer(localData.Resume);

    dt.items.add(
      new File([arrBfr], `${localData["Resume_name"]}`, {
        type: "application/pdf",
      })
    );
    inputElement.files = dt.files;
    inputElement.dispatchEvent(changeEvent);
    console.log("AutofillJobs: Resume Uploaded.");
    await sleep(delays.long);
    return true;
  }
  return false;
}
async function handleSkills() {
  //initial click
  const data = await getStorageDataLocal("Resume_details");

  let val = data["Resume_details"];
  if (val) {
    if (typeof val === "string") {
      let jsonData = JSON.parse(val);
      val = jsonData;
    }
    let dropElement = document
      .querySelector('[data-automation-id="formField-skills"]')
      .querySelector('[data-automation-id="multiselectInputContainer"]');
    for (let skill of val.skills) {
      dropElement.click();
      await sleep(500);

      let inputElement = dropElement.children[1].children[0];
      if (
        inputElement.getAttribute("data-automation-id") != "monikerSearchBox"
      ) {
        inputElement = dropElement.children[0].children[0];
      }
      inputElement.focus();
      await sleep(200);

      inputElement.value = skill;
      inputElement.setAttribute("value", skill);
      inputElement.dispatchEvent(inputEvent); // Notify the UI about the change
      inputElement.dispatchEvent(changeEvent); // Trigger any change listeners
      await sleep(200);

      inputElement.dispatchEvent(keyDownEvent); // Simulate keydown (Enter)
      inputElement.dispatchEvent(keyUpEvent); // Simulate keyup (Enter)
      await sleep(1000);
      let el = document.querySelector(
        ".ReactVirtualized__Grid__innerScrollContainer"
      );
      if (el != undefined) {
        let backupOption = undefined;
        for (let o of el.children) {
          if (
            o
              .getAttribute("aria-label")
              .toLowerCase()
              .includes(skill.toLowerCase())
          ) {
            if (o.getAttribute("aria-label").toLowerCase().includes("|")) {
              backupOption = o.children[o];
              continue;
            }
            backupOption = undefined;
            o.children[0].click();
            break;
          }
        }
        if (backupOption != undefined) backupOption.click();
      }
    }

    await sleep(delays.short);
    return true;
  }
  return false;
}
async function handleWorkExperience(jobParam) {
  const data = await getStorageDataLocal("Resume_details");

  let val = data["Resume_details"];
  if (val) {
    if (typeof val === "string") {
      let jsonData = JSON.parse(val);
      val = jsonData;
    }
    let addExpBtn = workdayQuery(jobParam, document, "button");

    let i = 0;
    for (let exp of val.experiences) {
      addExpBtn.click();
      await sleep(1250);

      let jobTitle = workdayQueryAll("jobTitle", document, "input")[i];
      let jobCompany = workdayQueryAll("companyName", document, "input")[i];
      let isCurrentEmployer = workdayQueryAll(
        "currentlyWorkHere",
        document,
        "input"
      )[i];
      let description = workdayQueryAll(
        "roleDescription",
        document,
        "textarea"
      )[i];
      let startMonth = workdayQueryAll(
        "startDate-dateSectionMonth",
        document,
        "input"
      )[i];
      let startYear = workdayQueryAll(
        "startDate-dateSectionYear",
        document,
        "input"
      )[i];
      let endMonth = workdayQueryAll(
        "endDate-dateSectionMonth",
        document,
        "input"
      )[i];
      let endYear = workdayQueryAll(
        "endDate-dateSectionYear",
        document,
        "input"
      )[i];
      setNativeValue(jobTitle, exp.jobTitle);
      await sleep(500);
      setNativeValue(jobCompany, exp.jobEmployer);
      await sleep(500);
      setNativeValue(isCurrentEmployer, exp.isCurrentEmployer);
      await sleep(500);
      let sMonth = monthToNumber(
        exp.jobDuration.split("-")[0].trim().split(" ")[0]
      );
      let sYear = exp.jobDuration.split("-")[0].trim().split(" ")[1];
      let eMonth = monthToNumber(
        exp.jobDuration.split("-")[1].trim().split(" ")[0]
      );
      let eYear = exp.jobDuration.split("-")[1].trim().split(" ")[1];
      startMonth.click();
      setNativeValue(startMonth, sMonth);
      await sleep(600);
      startYear.click();
      setNativeValue(startYear, sYear);
      await sleep(600);
      endMonth.click();
      setNativeValue(endMonth, eMonth);
      await sleep(600);
      endYear.click();
      setNativeValue(endYear, eYear);
      await sleep(600);
      setNativeValue(description, exp.roleBulletsString);
      i++;
    }

    await sleep(delays.short);
    return true;
  }

  return false;
}
async function handleInputElement(inputElement, jobParam, param, fillValue) {
  if (inputElement != undefined) {
    try {
      // Validate input element is visible and enabled
      if (inputElement.offsetParent === null || inputElement.disabled) {
        console.log("Trackr: Input element not visible or disabled:", jobParam);
        return false;
      }

      //text fields
      if (jobParam == "month-input") {
        fillValue = res["Current Date"].split("/")[1];
      }
      if (jobParam == "day-input") {
        fillValue = res["Current Date"].split("/")[0];
      }
      if (jobParam == "year-input") {
        fillValue = res["Current Date"].split("/")[2];
      }
      
      if (param == "Discipline") {
        let dropElement = document.querySelector(
          "[data-automation-id='multiselectInputContainer']"
        );
        if (dropElement) {
          dropElement.click();
          await sleep(1000);
          let disciplineInput = document.querySelector(
            "input[id='education-4--fieldOfStudy']"
          );

          if (disciplineInput) {
            disciplineInput.value = fillValue;
            disciplineInput.setAttribute("value", fillValue);

            await sleep(500);
            disciplineInput.dispatchEvent(keyDownEvent);

            await sleep(2000);
            disciplineInput.dispatchEvent(keyUpEvent);
            
            let el = document.querySelector(
              ".ReactVirtualized__Grid__innerScrollContainer"
            );
            if (el != undefined) {
              let backupOption = undefined;
              for (let o of el.children) {
                if (
                  o
                    .getAttribute("aria-label")
                    .toLowerCase()
                    .includes(fillValue.toLowerCase())
                ) {
                  if (o.getAttribute("aria-label").toLowerCase().includes("|")) {
                    backupOption = o.children[o];
                    continue;
                  }
                  backupOption = undefined;
                  o.children[0].click();
                  break;
                }
              }
              if (backupOption != undefined) backupOption.click();
            }
            return true;
          }
        }
        return false;
      }

      // Handle different input types
      if (inputElement.type === 'email' && !fillValue.includes('@')) {
        console.log("Trackr: Invalid email format:", fillValue);
        return false;
      }
      
      if (inputElement.type === 'tel' && !/^[\d\s\-\+\(\)]+$/.test(fillValue)) {
        console.log("Trackr: Invalid phone format:", fillValue);
        return false;
      }

      setNativeValue(inputElement, fillValue);
      console.log("Trackr: Successfully filled input:", jobParam, "with:", fillValue);
      return true;
      
    } catch (error) {
      console.log("Trackr: Error filling input element:", jobParam, error);
      return false;
    }
  }
  return false;
}
async function handleTextareaElement(textareaElement, jobParam, param, fillValue) {
  if (textareaElement != undefined) {
    setNativeValue(textareaElement, fillValue);
    await sleep(delays.short);
    return true;
  }
  return false;
}

async function handleSelectElement(selectElement, jobParam, param, fillValue) {
  if (selectElement != undefined) {
    // Try to find matching option
    let options = selectElement.querySelectorAll('option');
    let normalizedValue = fillValue.toLowerCase().trim();
    
    for (let option of options) {
      if (option.textContent.toLowerCase().includes(normalizedValue) ||
          normalizedValue.includes(option.textContent.toLowerCase())) {
        option.selected = true;
        selectElement.dispatchEvent(changeEvent);
        await sleep(delays.short);
        return true;
      }
    }
    
    // If no match found, try to set value directly
    selectElement.value = fillValue;
    selectElement.dispatchEvent(changeEvent);
    await sleep(delays.short);
    return true;
  }
  return false;
}

async function handleDropdownElement(dropdownElement, fillValue) {
  if (dropdownElement != undefined) {
    dropdownElement.click();
    await sleep(delays.long);
    //for the dropdown elements(workday version)
    let dropDown = document.querySelector('ul[role="listbox"][tabindex="-1"]');
    if (dropDown) {
      let btns = dropDown.querySelectorAll("li div");
      let normalizedParam = fillValue.toLowerCase().trim();
      if (normalizedParam.includes("decline")) fillValue = "decline";
      btns.forEach((btndiv) => {
        if (
          btndiv.textContent.toLowerCase().includes(normalizedParam) ||
          normalizedParam.includes(btndiv.textContent.toLowerCase()) ||
          (btndiv.textContent.toLowerCase().includes("self") &&
            fillValue == "decline")
        ) {
          btndiv.click();
        }
      });
      await sleep(delays.short);
      dropdownElement.blur();
    }

    return true;
  }
  return false;
}
