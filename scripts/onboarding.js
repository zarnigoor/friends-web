// let currentScreen = 0
// const screens = ["splash", "nameScreen", "profileScreen", "successScreen"]
// const userData = {
//   name: "",
//   image: null,
// }

// function nextScreen() {
//   if (currentScreen < screens.length - 1) {
//     // Validate current screen
//     if (currentScreen === 1 && !validateName()) {
//       return
//     }
//     if (currentScreen === 2) {
//       // Save data before moving to success
//       userData.name = document.getElementById("nameInput").value
//       document.getElementById("userName").textContent = userData.name
//     }

//     document.getElementById(screens[currentScreen]).classList.remove("active")
//     document.getElementById(screens[currentScreen]).classList.add("prev")
//     currentScreen++

//     setTimeout(() => {
//       document.getElementById(screens[currentScreen]).classList.add("active")
//       // Update step indicators
//       updateStepIndicators()
//     }, 100)
//   }
// }

// function prevScreen() {
//   if (currentScreen > 0) {
//     document.getElementById(screens[currentScreen]).classList.remove("active")
//     currentScreen--
//     document.getElementById(screens[currentScreen]).classList.remove("prev")

//     setTimeout(() => {
//       document.getElementById(screens[currentScreen]).classList.add("active")
//       // Update step indicators
//       updateStepIndicators()
//     }, 100)
//   }
// }

// function updateStepIndicators() {
//   // Update step indicators for form screens
//   if (currentScreen >= 1 && currentScreen <= 2) {
//     const stepIndicators = document.querySelectorAll(".step-indicator")
//     stepIndicators.forEach((indicator) => {
//       const steps = indicator.querySelectorAll(".step")
//       steps.forEach((step, index) => {
//         if (index < currentScreen) {
//           step.classList.add("active")
//         } else {
//           step.classList.remove("active")
//         }
//       })
//     })
//   }
// }

// function validateName() {
//   const nameInput = document.getElementById("nameInput")
//   const nameError = document.getElementById("nameError")
//   const nameNext = document.getElementById("nameNext")
//   const name = nameInput.value.trim()

//   if (name.length < 2) {
//     nameError.textContent = "Name must be at least 2 characters long"
//     nameNext.disabled = true
//     return false
//   }

//   nameError.textContent = ""
//   nameNext.disabled = false
//   return true
// }

// function previewImage() {
//   const input = document.getElementById("imageInput")
//   const preview = document.getElementById("imagePreview")
//   const urlInput = document.getElementById("imageUrlInput")

//   if (input.files && input.files[0]) {
//     // Clear URL input when file is selected
//     urlInput.value = ""

//     const reader = new FileReader()
//     reader.onload = (e) => {
//       preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`
//       userData.image = e.target.result
//     }
//     reader.readAsDataURL(input.files[0])
//   }
// }

// function previewImageUrl() {
//   const urlInput = document.getElementById("imageUrlInput")
//   const preview = document.getElementById("imagePreview")
//   const fileInput = document.getElementById("imageInput")
//   const url = urlInput.value.trim()

//   if (url) {
//     // Clear file input when URL is entered
//     fileInput.value = ""

//     // Create image element to test if URL is valid
//     const img = new Image()
//     img.onload = () => {
//       preview.innerHTML = `<img src="${url}" alt="Profile Preview">`
//       userData.image = url
//     }
//     img.onerror = () => {
//       preview.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-size: 14px;">Invalid image URL</p>'
//       userData.image = null
//     }
//     img.src = url
//   } else {
//     preview.innerHTML = ""
//     userData.image = null
//   }
// }

// function enterApp() {
//   // Save user data to localStorage
//   localStorage.setItem("userData", JSON.stringify(userData))
//   // Redirect to main app
//   window.location.href = "index.html"
// }

// // Add keyboard navigation
// document.addEventListener("keydown", (e) => {
//   if (e.key === "Enter" && currentScreen === 1) {
//     if (validateName()) {
//       nextScreen()
//     }
//   }
// })

// // Auto-focus on name input when screen loads
// setTimeout(() => {
//   if (currentScreen === 1) {
//     document.getElementById("nameInput")?.focus()
//   }
// }, 1000)
