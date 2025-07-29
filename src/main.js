import "mapbox-gl/dist/mapbox-gl.css"
import "./main.css"
import mapboxgl from "mapbox-gl"
import * as turf from "@turf/turf"
import { io } from "socket.io-client"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const joinButton = document.querySelector(".joinButton")
const activeUsers = new Map() // Users currently displayed on map/list
let hasJoined = false
let currentUsername = null
let server = null

const currentUserData = {
  username: "",
  avatar: "",
  bio: "",
  age: "",
  interests: "",
  socialLinks: "",
  level: 1,
  badges: ["newcomer"],
}

// Sound effects
const sounds = {
  join: new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
  ),
  leave: new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
  ),
  notification: new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
  ),
}

const map = new mapboxgl.Map({
  container: "map",
  attributionControl: false,
  logoPosition: "bottom-right",
  zoom: 9,
  center: [69.2753, 41.3126],
  hash: true,
  minZoom: 1,
  maxZoom: 18,
  projection: "mercator",
})

map.on("load", async () => {
  console.clear()
  server = io("http://localhost:3000")

  server.on("new_user", (geoJSON) => {
    if (geoJSON.type === "Feature") {
      // Add or update user in activeUsers map
      addNewUser(geoJSON, map)
      // Only show join alert to others, not the user who joined
      if (hasJoined && geoJSON.properties.username !== currentUsername) {
        showUserJoinAlert(geoJSON.properties.username)
        playSound("join")
      }
      updateUserList()

      // If this is the current user joining, focus on all users
      if (geoJSON.properties.username === currentUsername && hasJoined) {
        setTimeout(() => {
          if (activeUsers.size > 0) {
            const allCoordinates = Array.from(activeUsers.values()).map((user) => user.coordinates)
            if (allCoordinates.length > 1) {
              const bbox = turf.bbox({
                type: "FeatureCollection",
                features: allCoordinates.map((coord) => ({
                  type: "Feature",
                  geometry: { type: "Point", coordinates: coord },
                })),
              })
              map.fitBounds(bbox, {
                padding: 100,
                duration: 2000,
                essential: true,
              })
            }
          }
        }, 500)
      }
    } else if (geoJSON.type === "FeatureCollection") {
      // This is for initial load of existing users
      for (const geoJSONFeature of geoJSON.features) {
        addNewUser(geoJSONFeature, map)
      }
      updateUserList()

      // Show welcome alert AFTER users are loaded
      if (!hasJoined) {
        setTimeout(() => {
          showWelcomeAlert()
        }, 500)
      }

      if (geoJSON.features.length > 0) {
        const bbox = turf.bbox(geoJSON)
        map.fitBounds(bbox, {
          padding: 200,
          duration: 1_000,
          essential: true,
        })
      }
    }
  })

  server.on("user_updated", (updatedGeoJSON) => {
    // Update user data in activeUsers map
    if (activeUsers.has(updatedGeoJSON.properties.username)) {
      const user = activeUsers.get(updatedGeoJSON.properties.username)
      Object.assign(user, updatedGeoJSON.properties) // Update all properties
      user.marker.getElement().style.backgroundImage = `url(${user.avatar})` // Update marker image
    } else {
      // If the user wasn't in activeUsers (e.g., new user joining), add them
      addNewUser(updatedGeoJSON, map)
    }
    updateUserList() // Refresh the user list to reflect changes
  })

  server.on("user_disconnected", (username) => {
    if (activeUsers.has(username)) {
      const user = activeUsers.get(username)
      user.marker.remove()
      activeUsers.delete(username)
      updateUserList()
      if (hasJoined) {
        playSound("leave")
      }
    }
  })

  joinButton.onclick = () => {
    showJoinModal(server)
  }

  // Initialize user list
  updateUserList()

  // Show welcome alert for first-time users if no users loaded after 1 second
  setTimeout(() => {
    if (!hasJoined && activeUsers.size === 0) {
      showWelcomeAlert()
    }
  }, 1000)
})

function playSound(type) {
  if (sounds[type]) {
    sounds[type].currentTime = 0
    sounds[type].play().catch((e) => console.log("Sound play failed:", e))
  }
}

function addNewUser(geoJSONFeature, map) {
  const username = geoJSONFeature.properties.username

  // If user already exists, update their data and marker
  if (activeUsers.has(username)) {
    const existingUser = activeUsers.get(username)
    Object.assign(existingUser, geoJSONFeature.properties) // Update properties
    existingUser.marker.setLngLat(geoJSONFeature.geometry.coordinates) // Update coordinates
    existingUser.marker.getElement().style.backgroundImage = `url(${geoJSONFeature.properties.avatar})`
    return // Exit as user is updated
  }

  const el = document.createElement("div")
  el.className = "user"

  // Show anonymous until user joins
  if (!hasJoined) {
    el.style.backgroundImage = `url(https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png)`
    el.onclick = () => {
      showJoinAlert()
    }
  } else {
    el.style.backgroundImage = `url(${geoJSONFeature.properties.avatar})`
    el.onclick = () => {
      showUserPopup(activeUsers.get(username))
    }
  }

  const marker = new mapboxgl.Marker(el)
  marker.setLngLat(geoJSONFeature.geometry.coordinates)
  marker.addTo(map)

  activeUsers.set(username, {
    username: username,
    avatar: geoJSONFeature.properties.avatar,
    marker: marker,
    coordinates: geoJSONFeature.geometry.coordinates,
    bio: geoJSONFeature.properties.bio || "",
    age: geoJSONFeature.properties.age || "",
    interests: geoJSONFeature.properties.interests || "",
    socialLinks: geoJSONFeature.properties.socialLinks || "",
  })
}

function showUserJoinAlert(username) {
  const alert = document.createElement("div")
  alert.className = "user-join-alert"
  alert.innerHTML = `        
        <span>${username} joined</span>        
        <button class="close-alert" onclick="this.parentElement.remove()">×</button>    
    `
  document.body.appendChild(alert)

  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove()
    }
  }, 6000)
}

function updateUserList() {
  const userListContainer = document.querySelector(".user-list")
  const activeUsersTitle = document.querySelector(".user-list-container h3")

  if (!userListContainer || !activeUsersTitle) return

  userListContainer.innerHTML = ""

  // Update title with correct user count
  const userCount = activeUsers.size
  activeUsersTitle.textContent = `Active Users (${userCount})`

  if (!hasJoined) {
    // Show real number of users but with "no_name" and default avatar
    activeUsers.forEach((user) => {
      const userItem = document.createElement("div")
      userItem.className = "user-item"
      userItem.innerHTML = `                
                <img src="https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png" alt="no_name" class="user-avatar">                
                <span class="username">no_name</span>            
            `
      userListContainer.appendChild(userItem)
    })
  } else {
    // Show real users with real info and click functionality
    // Put current user first, then others
    const usersArray = Array.from(activeUsers.values())
    const currentUserDisplayData = usersArray.find((user) => user.username === currentUsername)
    const otherUsers = usersArray.filter((user) => user.username !== currentUsername)

    const sortedUsers = currentUserDisplayData ? [currentUserDisplayData, ...otherUsers] : usersArray

    sortedUsers.forEach((user) => {
      const userItem = document.createElement("div")
      userItem.className = "user-item"
      userItem.style.cursor = "pointer"
      userItem.style.position = "relative"

      // Highlight current user
      if (user.username === currentUsername) {
        userItem.style.background = "linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)"
        userItem.style.border = "2px solid darkslategray"
      }

      userItem.innerHTML = `                
                <img src="${user.avatar}" alt="${user.username}" class="user-avatar">                
                <span class="username">${user.username}${user.username === currentUsername ? " (You)" : ""}</span>
            `

      // Add click event to fly to user
      userItem.onclick = () => {
        flyToUser(user)
      }

      userListContainer.appendChild(userItem)
    })
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `
  document.body.appendChild(notification)

  playSound("notification")

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 4000)
}

function flyToUser(user) {
  // Fly to user location
  map.flyTo({
    center: user.coordinates,
    zoom: 15,
    duration: 2000,
    essential: true,
  })

  // Show beautiful user popup with details
  showUserPopup(user)
}

function showUserPopup(user) {
  // Remove existing popup if any
  const existingPopup = document.querySelector(".user-popup")
  if (existingPopup) {
    existingPopup.remove()
  }

  const popup = document.createElement("div")
  popup.className = "user-popup"
  popup.innerHTML = `
        <div class="user-popup-content">
            <button class="popup-close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
            <div class="popup-avatar">
                <img src="${user.avatar}" alt="${user.username}">
            </div>
            <h3 class="popup-username">${user.username}</h3>
            <p class="popup-status">Currently online</p>
            
            ${
              user.age
                ? `<div class="popup-detail">
                <span class="detail-label">Age:</span>
                <span class="detail-value">${user.age}</span>
            </div>`
                : ""
            }
            
            ${
              user.bio
                ? `<div class="popup-detail">
                <span class="detail-label">Bio:</span>
                <span class="detail-value">${user.bio}</span>
            </div>`
                : ""
            }
            
            ${
              user.interests
                ? `<div class="popup-detail">
                <span class="detail-label">Interests:</span>
                <span class="detail-value">${user.interests}</span>
            </div>`
                : ""
            }
            
            ${
              user.socialLinks
                ? `<div class="popup-detail">
                <span class="detail-label">Social:</span>
                <span class="detail-value">${user.socialLinks}</span>
            </div>`
                : ""
            }
        </div>
    `

  document.body.appendChild(popup)

  // Auto-remove after 8 seconds (longer to read details)
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove()
    }
  }, 8000)
}

function showJoinModal(server) {
  const modal = document.getElementById("joinModal")
  const form = document.getElementById("joinForm")
  const cancelBtn = document.querySelector(".cancel-btn")
  const fileInput = document.getElementById("profileImage")
  const imagePreview = document.getElementById("imagePreview")

  // Show modal
  modal.style.display = "block"

  // Handle file upload preview
  fileInput.onchange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`
      }
      reader.readAsDataURL(file)
    } else {
      imagePreview.innerHTML = ""
    }
  }

  // Handle cancel
  const closeModal = () => {
    modal.style.display = "none"
    form.reset()
    imagePreview.innerHTML = ""
  }

  cancelBtn.onclick = closeModal

  // Close modal when clicking outside
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }

  // Handle form submission
  form.onsubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(form)
    const username = formData.get("username")
    let avatar = "https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png"

    // Validation
    if (!username || username.trim() === "") {
      alert("Name is required!")
      return
    }

    const profileImage = formData.get("profileImage")
    if (profileImage && profileImage.size > 0) {
      // Upload image to backend
      try {
        const uploadFormData = new FormData()
        uploadFormData.append("profileImage", profileImage)

        const response = await fetch("http://localhost:3000/upload", {
          method: "POST",
          body: uploadFormData,
        })

        if (response.ok) {
          const result = await response.json()
          avatar = result.fileUrl
        } else {
          const errorData = await response.json()
          console.error("Upload failed:", errorData)
          alert("Upload failed: " + (errorData.error || "Unknown error"))
          return
        }
      } catch (error) {
        console.error("Upload error:", error)
        alert("Upload failed: " + error.message)
        return
      }
    }

    currentUsername = username.trim()
    currentUserData.username = currentUsername
    currentUserData.avatar = avatar

    joinWithData(server, currentUsername, avatar)
    closeModal()
  }
}

function showWelcomeAlert() {
  const welcomeAlert = document.createElement("div")
  welcomeAlert.className = "welcome-alert"

  // Get current user count
  const currentUserCount = activeUsers.size

  welcomeAlert.innerHTML = `        
        <div class="welcome-content">            
            <button class="welcome-close-btn" onclick="this.parentElement.parentElement.remove();">×</button>            
            <h2>Welcome to Friends!</h2>            
            <p>${currentUserCount} users are currently using this app</p>            
            <p>Join now to unlock real user profiles and connect with others!</p>            
            <button class="welcome-join-btn" onclick="this.parentElement.parentElement.remove(); document.querySelector('.joinButton').click();">Join Now</button>        
        </div>    
    `
  document.body.appendChild(welcomeAlert)

  // Auto-remove after 6 seconds if not closed manually
  setTimeout(() => {
    if (welcomeAlert.parentElement) {
      welcomeAlert.remove()
    }
  }, 6000)
}

function showJoinAlert() {
  const alert = document.createElement("div")
  alert.className = "join-required-alert"
  alert.innerHTML = `
    <div class="join-alert-content">
      <button class="join-alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
      <div class="join-alert-icon">🔒</div>
      <h3>Join Required</h3>
      <p>You need to join to see user details!</p>
      <button class="join-alert-btn" onclick="this.parentElement.parentElement.remove(); document.querySelector('.joinButton').click();">Join Now</button>
    </div>
  `
  document.body.appendChild(alert)

  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove()
    }
  }, 4000)
}

function showSettingsModal() {
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.id = "settingsModal"
  modal.innerHTML = `
    <div class="modal-content settings-modal">
      <h2>Profile Settings</h2>
      <div class="settings-tabs">
        <button class="tab-btn active" onclick="showSettingsTab('profile')">Profile</button>
      </div>
      
      <div id="profile-tab" class="settings-tab active">
        <form id="profileForm">
          <div class="input-group">
            <label for="editUsername">Username</label>
            <input type="text" id="editUsername" value="${currentUserData.username}" required>
          </div>
          
          <div class="input-group">
            <label for="editAge">Age</label>
            <input type="number" id="editAge" value="${currentUserData.age}" min="13" max="120">
          </div>
          
          <div class="input-group">
            <label for="editBio">Bio</label>
            <textarea id="editBio" placeholder="Tell us about yourself..." maxlength="200">${currentUserData.bio}</textarea>
          </div>
          
          <div class="input-group">
            <label for="editInterests">Interests</label>
            <input type="text" id="editInterests" value="${currentUserData.interests}" placeholder="Music, Sports, Travel...">
          </div>
          
          <div class="input-group">
            <label for="editSocialLinks">Social Links</label>
            <input type="text" id="editSocialLinks" value="${currentUserData.socialLinks}" placeholder="Instagram, Twitter...">
          </div>
          
          <div class="input-group">
            <label for="editProfileImage">Change Profile Picture</label>
            <input type="file" id="editProfileImage" accept="image/*">
            <div class="current-avatar">
              <img src="${currentUserData.avatar}" alt="Current avatar">
            </div>
          </div>
          
          <div class="user-stats">
            <div class="stat">
              <span class="stat-label">Level</span>
              <span class="stat-value">${currentUserData.level}</span>
            </div>
            <div class="badges">
              <span class="badge-label">Badges:</span>
              ${currentUserData.badges.map((badge) => `<span class="badge">${getBadgeIcon(badge)} ${badge}</span>`).join("")}
            </div>
          </div>
          
          <div class="modal-buttons">
            <button type="button" class="cancel-btn" onclick="closeSettingsModal()">Cancel</button>
            <button type="button" class="save-btn" onclick="saveSettings()">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `

  modal.style.display = "block"
  document.body.appendChild(modal)

  // Close modal when clicking outside
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeSettingsModal()
    }
  }
}

function showSettingsTab(tabName) {
  // Remove active class from all tabs and buttons
  document.querySelectorAll(".settings-tab").forEach((tab) => tab.classList.remove("active"))
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))

  // Add active class to selected tab and button
  document.getElementById(`${tabName}-tab`).classList.add("active")
  event.target.classList.add("active")
}

function getBadgeIcon(badge) {
  const icons = {
    newcomer: "🌟",
    explorer: "🗺️",
    social: "👥",
    veteran: "🏆",
  }
  return icons[badge] || "🏅"
}

function saveSettings() {
  // Get form values
  const newUsername = document.getElementById("editUsername").value.trim()
  const newAge = document.getElementById("editAge").value
  const newBio = document.getElementById("editBio").value.trim()
  const newInterests = document.getElementById("editInterests").value.trim()
  const newSocialLinks = document.getElementById("editSocialLinks").value.trim()
  const newProfileImage = document.getElementById("editProfileImage").files[0]

  // Validation
  if (!newUsername) {
    alert("Username is required!")
    return
  }

  // Store old username for comparison
  const oldUsername = currentUserData.username

  // Update local currentUserData
  currentUserData.username = newUsername
  currentUserData.age = newAge
  currentUserData.bio = newBio
  currentUserData.interests = newInterests
  currentUserData.socialLinks = newSocialLinks

  // Prepare data to send to server
  const updatedDataForServer = {
    username: newUsername,
    age: newAge,
    bio: newBio,
    interests: newInterests,
    socialLinks: newSocialLinks,
    avatar: currentUserData.avatar, // Send current avatar, will be updated if new image uploaded
  }

  // Handle profile image upload if changed
  if (newProfileImage) {
    const formData = new FormData()
    formData.append("profileImage", newProfileImage)

    fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          currentUserData.avatar = result.fileUrl // Update local avatar
          updatedDataForServer.avatar = result.fileUrl // Update avatar for server payload

          // Update current user's marker and list immediately
          if (activeUsers.has(oldUsername)) {
            // Use oldUsername to find the marker
            const user = activeUsers.get(oldUsername)
            user.avatar = result.fileUrl
            user.marker.getElement().style.backgroundImage = `url(${result.fileUrl})`
          }
          // If username changed, need to re-add with new username
          if (newUsername !== oldUsername) {
            const user = activeUsers.get(oldUsername)
            activeUsers.delete(oldUsername)
            activeUsers.set(newUsername, { ...user, username: newUsername, avatar: result.fileUrl })
          }
          updateUserList()
          server.emit("user_updated", updatedDataForServer) // Emit after avatar is updated
        }
      })
      .catch((error) => {
        console.error("Upload error:", error)
        showNotification("Profile image upload failed!", "error")
      })
  } else {
    // If no new image, just emit the updated data
    server.emit("user_updated", updatedDataForServer)
  }

  // Update current username if it changed
  if (newUsername !== oldUsername) {
    if (activeUsers.has(oldUsername)) {
      const userData = activeUsers.get(oldUsername)
      activeUsers.delete(oldUsername)
      activeUsers.set(newUsername, { ...userData, username: newUsername })
    }
    currentUsername = newUsername
  }

  // Update local activeUsers map with new data (excluding avatar if it's handled by upload callback)
  if (activeUsers.has(currentUsername)) {
    const userData = activeUsers.get(currentUsername)
    userData.bio = newBio
    userData.age = newAge
    userData.interests = newInterests
    userData.socialLinks = newSocialLinks
  }

  updateUserList()
  closeSettingsModal()
  showNotification("Profile updated successfully!", "success")
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal")
  if (modal) {
    modal.remove()
  }
}

function joinWithData(server, username, avatar) {
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const coordinates = [
      coords.longitude + Math.random() * Math.random(),
      coords.latitude + Math.random() * Math.random(),
    ]

    hasJoined = true
    server.emit("new_user", {
      username: username,
      avatar: avatar,
      coordinates: coordinates,
      bio: currentUserData.bio,
      age: currentUserData.age,
      interests: currentUserData.interests,
      socialLinks: currentUserData.socialLinks,
    })

    // Refresh all markers to show real avatars and update click handlers
    activeUsers.forEach((user) => {
      const markerElement = user.marker.getElement()
      markerElement.style.backgroundImage = `url(${user.avatar})`
      markerElement.onclick = () => {
        showUserPopup(user)
      }
    })

    updateUserList()
    playSound("join")
  })
}

// Make functions global for onclick handlers
window.showSettingsModal = showSettingsModal
window.showSettingsTab = showSettingsTab
window.saveSettings = saveSettings
window.closeSettingsModal = closeSettingsModal
