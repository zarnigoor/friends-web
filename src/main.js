import "mapbox-gl/dist/mapbox-gl.css"
import "./main.css"
import mapboxgl from "mapbox-gl"
import * as turf from "@turf/turf"
import { io } from "socket.io-client"

mapboxgl.accessToken = "pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbWRmazhzdG0wZHVzMmlzOGdrNHFreWV6In0.ENVcoFkxKIqNeCEax2JoFg"

const joinExitButton = document.getElementById("joinExitButton")
const activeUsers = new Map() // Users currently displayed on map/list
const conversations = new Map() // Store conversations
const persistedUsers = new Map() // Store users that were seen before joining
let hasJoined = false
let currentUsername = null
let server = null
let joinTime = null
let currentChatUser = null

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

// Global variables ga qo'shamiz
const unreadMessages = new Map() // Store unread count per user
let totalUnreadCount = 0

// LocalStorage dan ma'lumotlarni yuklash
function loadUserDataFromStorage() {
  try {
    const savedData = localStorage.getItem("friendsAppUserData")
    if (savedData) {
      const data = JSON.parse(savedData)
      // Username ni avtomatik to'ldirmaymiz, faqat boshqa ma'lumotlarni yuklaymiz
      currentUserData.avatar = data.avatar || ""
      currentUserData.bio = data.bio || ""
      currentUserData.age = data.age || ""
      currentUserData.interests = data.interests || ""
      currentUserData.socialLinks = data.socialLinks || ""
      console.log("User data loaded from localStorage (except username)")
    }
  } catch (error) {
    console.error("Error loading user data from localStorage:", error)
  }
}

// LocalStorage ga ma'lumotlarni saqlash
function saveUserDataToStorage() {
  try {
    const dataToSave = {
      username: currentUserData.username,
      avatar: currentUserData.avatar,
      bio: currentUserData.bio,
      age: currentUserData.age,
      interests: currentUserData.interests,
      socialLinks: currentUserData.socialLinks,
    }
    localStorage.setItem("friendsAppUserData", JSON.stringify(dataToSave))
    console.log("User data saved to localStorage")
  } catch (error) {
    console.error("Error saving user data to localStorage:", error)
  }
}

// Sahifa yuklanganda ma'lumotlarni yuklash
loadUserDataFromStorage()

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
        // Store in persisted users for later use
        persistedUsers.set(geoJSONFeature.properties.username, {
          username: geoJSONFeature.properties.username,
          avatar: geoJSONFeature.properties.avatar,
          coordinates: geoJSONFeature.geometry.coordinates,
          bio: geoJSONFeature.properties.bio || "",
          age: geoJSONFeature.properties.age || "",
          interests: geoJSONFeature.properties.interests || "",
          socialLinks: geoJSONFeature.properties.socialLinks || "",
          joinedAt: geoJSONFeature.properties.joinedAt || Date.now(),
        })
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

    // Also update persisted users
    if (persistedUsers.has(updatedGeoJSON.properties.username)) {
      const persistedUser = persistedUsers.get(updatedGeoJSON.properties.username)
      Object.assign(persistedUser, updatedGeoJSON.properties)
    }

    updateUserList() // Refresh the user list to reflect changes
  })

  server.on("user_disconnected", (username) => {
    if (activeUsers.has(username)) {
      const user = activeUsers.get(username)

      // Store in persisted users before removing
      persistedUsers.set(username, {
        username: username,
        avatar: user.avatar,
        coordinates: user.coordinates,
        bio: user.bio || "",
        age: user.age || "",
        interests: user.interests || "",
        socialLinks: user.socialLinks || "",
        joinedAt: user.joinedAt || Date.now(),
      })

      user.marker.remove()
      activeUsers.delete(username)
      updateUserList()
      if (hasJoined) {
        playSound("leave")
      }
    }
  })

  // server.on("new_message") ni yangilaymiz
  server.on("new_message", (messageData) => {
    const { from, to, message, timestamp } = messageData

    if (to === currentUsername) {
      // Message is for current user
      if (!conversations.has(from)) {
        conversations.set(from, [])
      }
      conversations.get(from).push({
        from: from,
        message: message,
        timestamp: timestamp,
        isOwn: false,
      })

      // Unread message count ni yangilaymiz
      if (currentChatUser !== from) {
        // Agar hozir shu user bilan chat qilmayotgan bo'lsa
        const currentUnread = unreadMessages.get(from) || 0
        unreadMessages.set(from, currentUnread + 1)
        updateUnreadBadge()
      }

      updateChatSidebar()
      showNotification(`New message from ${from}`, "info")
      playSound("notification")

      // If currently viewing this conversation, update messages
      if (currentChatUser === from) {
        loadConversationMessages(from)
      }
    }
  })

  server.on("chat_deleted", (deleteData) => {
    // Remove conversation from local storage
    conversations.delete(deleteData.with)

    // Update UI
    updateChatSidebar()

    // If currently viewing this conversation, go back to list
    if (currentChatUser === deleteData.with) {
      showChatUserList()
    }
  })

  joinExitButton.onclick = () => {
    if (hasJoined) {
      // Exit functionality
      exitApp()
    } else {
      // Join functionality
      showJoinModal(server)
    }
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

  console.log(`Adding/updating user: ${username}`) // Debug uchun

  // If user already exists, update their data and marker
  if (activeUsers.has(username)) {
    console.log(`User ${username} already exists, updating...`) // Debug uchun
    const existingUser = activeUsers.get(username)
    Object.assign(existingUser, geoJSONFeature.properties) // Update properties
    existingUser.marker.setLngLat(geoJSONFeature.geometry.coordinates) // Update coordinates
    existingUser.marker.getElement().style.backgroundImage = `url(${geoJSONFeature.properties.avatar})`
    return // Exit as user is updated
  }

  console.log(`Adding new user: ${username}`) // Debug uchun

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
    joinedAt: geoJSONFeature.properties.joinedAt || Date.now(),
  })

  console.log(`Total users after adding ${username}: ${activeUsers.size}`) // Debug uchun
}

// exitApp funksiyasini yangilaymiz
function exitApp() {
  // Disconnect from server but allow reconnection
  if (server) {
    server.disconnect()
    // Reconnect immediately to stay connected but as non-joined user
    setTimeout(() => {
      server.connect()
    }, 500)
  }

  // Reset state
  hasJoined = false
  currentUsername = null
  joinTime = null
  currentChatUser = null

  // Clear active users but keep markers for persisted users
  activeUsers.forEach((user) => {
    user.marker.remove()
  })
  activeUsers.clear()

  // Re-add persisted users as "no_name" with anonymous avatars
  persistedUsers.forEach((userData, username) => {
    const el = document.createElement("div")
    el.className = "user"
    el.style.backgroundImage = `url(https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png)`
    el.onclick = () => {
      showJoinAlert()
    }

    const marker = new mapboxgl.Marker(el)
    marker.setLngLat(userData.coordinates)
    marker.addTo(map)

    activeUsers.set(username, {
      username: username,
      avatar: "https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png",
      marker: marker,
      coordinates: userData.coordinates,
      joinedAt: userData.joinedAt,
      isAnonymous: true,
    })
  })

  // Reset button
  joinExitButton.textContent = "Join"
  joinExitButton.classList.remove("exit-mode")

  // Update UI
  updateUserList()
  updateChatSidebar()

  showNotification("You have left the app", "info")

  // Clear unread messages
  unreadMessages.clear()
  updateUnreadBadge()
}

function getTimeAgo(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
  return `${seconds} second${seconds !== 1 ? "s" : ""} ago`
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

  // Real user count ni to'g'ri hisoblash
  const realUserCount = activeUsers.size
  console.log(`Total users in activeUsers: ${realUserCount}`) // Debug uchun

  // Update title with correct user count
  activeUsersTitle.textContent = `Active Users (${realUserCount})`

  if (!hasJoined) {
    // Show real number of users but with "no_name" and default avatar
    let displayedCount = 0
    activeUsers.forEach((user) => {
      const userItem = document.createElement("div")
      userItem.className = "user-item"
      userItem.innerHTML = `
        <img src="https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png" alt="no_name" class="user-avatar">
        <span class="username">no_name</span>
      `
      userItem.onclick = () => {
        showJoinAlert()
      }
      userListContainer.appendChild(userItem)
      displayedCount++
    })
    console.log(`Displayed ${displayedCount} anonymous users`) // Debug uchun
  } else {
    // Show real users with real info and click functionality
    // Put current user first, then others
    const usersArray = Array.from(activeUsers.values())
    const currentUserDisplayData = usersArray.find((user) => user.username === currentUsername)
    const otherUsers = usersArray.filter((user) => user.username !== currentUsername)
    const sortedUsers = currentUserDisplayData ? [currentUserDisplayData, ...otherUsers] : usersArray

    console.log(`Displaying ${sortedUsers.length} real users`) // Debug uchun

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

  const coordinates = user.coordinates
  const locationText = `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`
  const joinedText = getTimeAgo(user.joinedAt || Date.now())

  // Show additional info if user has updated their profile
  let additionalInfo = ""
  if (user.bio || user.age || user.interests) {
    additionalInfo = `
      ${user.bio ? `<p class="popup-bio">Bio: ${user.bio}</p>` : ""}
      ${user.age ? `<p class="popup-age">Age: ${user.age}</p>` : ""}
      ${user.interests ? `<p class="popup-interests">Interests: ${user.interests}</p>` : ""}
    `
  }

  popup.innerHTML = `
    <div class="user-popup-content">
      <button class="popup-close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      <div class="popup-avatar">
        <img src="${user.avatar}" alt="${user.username}">
      </div>
      <h3 class="popup-username">${user.username}</h3>
      <p class="popup-location">Location: ${locationText}</p>
      <p class="popup-joined">Joined: ${joinedText}</p>
      ${additionalInfo}
      
      <div class="popup-actions">
        <div class="popup-message-section">
          <input type="text" class="popup-message-input" placeholder="Type a message..." maxlength="200">
          <button class="popup-send-btn" onclick="sendMessage('${user.username}', this.previousElementSibling.value, this)">Send</button>
        </div>
        <button class="popup-close-action" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
      </div>
    </div>
  `

  document.body.appendChild(popup)

  // Focus on input
  const input = popup.querySelector(".popup-message-input")
  input.focus()

  // Handle Enter key
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const sendBtn = popup.querySelector(".popup-send-btn")
      sendMessage(user.username, input.value, sendBtn)
    }
  })

  // Auto-remove after 15 seconds if no interaction
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove()
    }
  }, 15000)
}

function sendMessage(toUsername, message, buttonElement, fromConversation = false) {
  if (!message || !message.trim()) {
    showNotification("Please enter a message", "error")
    return
  }

  if (!hasJoined) {
    showJoinAlert()
    return
  }

  const messageData = {
    from: currentUsername,
    to: toUsername,
    message: message.trim(),
    timestamp: Date.now(),
  }

  // Send to server
  server.emit("send_message", messageData)

  // Add to local conversations
  if (!conversations.has(toUsername)) {
    conversations.set(toUsername, [])
  }
  conversations.get(toUsername).push({
    from: currentUsername,
    message: message.trim(),
    timestamp: Date.now(),
    isOwn: true,
  })

  // Update chat sidebar
  updateChatSidebar()

  // If in conversation view, update messages
  if (fromConversation && currentChatUser === toUsername) {
    loadConversationMessages(toUsername)
  }

  showNotification(`Message sent to ${toUsername}`, "success")

  // Close popup if sent from popup
  if (buttonElement) {
    const input = buttonElement.previousElementSibling
    input.value = ""

    const popup = buttonElement.closest(".user-popup")
    if (popup) {
      popup.remove()
    }
  }
}

function toggleChatSidebar() {
  const chatSidebar = document.getElementById("chatSidebar")

  if (!chatSidebar.classList.contains("open")) {
    chatSidebar.classList.add("open")
    updateChatSidebar()
    showChatUserList() // Always show user list when opening
  } else {
    chatSidebar.classList.remove("open")
  }
}

function showChatUserList() {
  document.getElementById("chatUserList").style.display = "block"
  document.getElementById("chatConversationView").style.display = "none"
  currentChatUser = null
}

// showChatConversation funksiyasini yangilaymiz
function showChatConversation(username) {
  document.getElementById("chatUserList").style.display = "none"
  document.getElementById("chatConversationView").style.display = "flex"
  document.getElementById("conversationUsername").textContent = username
  currentChatUser = username

  // Mark messages as read
  unreadMessages.set(username, 0)
  updateUnreadBadge()

  loadConversationMessages(username)
  updateChatSidebar() // Refresh to remove unread indicator

  // Focus on input
  setTimeout(() => {
    document.getElementById("conversationInput").focus()
  }, 100)
}

function loadConversationMessages(username) {
  const messagesContainer = document.getElementById("conversationMessages")
  messagesContainer.innerHTML = ""

  if (!conversations.has(username)) {
    messagesContainer.innerHTML =
      '<div style="text-align: center; opacity: 0.7; margin-top: 2rem;">No messages yet</div>'
    return
  }

  const messages = conversations.get(username)
  messages.forEach((message) => {
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${message.isOwn ? "own" : "other"}`

    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    messageDiv.innerHTML = `
      <div class="message-bubble">${message.message}</div>
      <div class="message-time">${time}</div>
    `

    messagesContainer.appendChild(messageDiv)
  })

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function sendConversationMessage() {
  const input = document.getElementById("conversationInput")
  const message = input.value.trim()

  if (!message || !currentChatUser) return

  sendMessage(currentChatUser, message, null, true)
  input.value = ""

  // Auto-resize textarea
  input.style.height = "auto"
}

// Badge ni yangilash funksiyasi
function updateUnreadBadge() {
  totalUnreadCount = 0
  unreadMessages.forEach((count) => {
    totalUnreadCount += count
  })

  const badge = document.getElementById("chatNotificationBadge")
  if (totalUnreadCount > 0) {
    badge.style.display = "flex"
    badge.textContent = totalUnreadCount > 99 ? "99+" : totalUnreadCount.toString()
  } else {
    badge.style.display = "none"
  }
}

// updateChatSidebar funksiyasini yangilaymiz
function updateChatSidebar() {
  const chatUserList = document.getElementById("chatUserList")

  if (!chatUserList) return

  if (conversations.size === 0) {
    chatUserList.innerHTML = '<div class="no-conversations">No conversations yet</div>'
    return
  }

  chatUserList.innerHTML = ""

  conversations.forEach((messages, username) => {
    const lastMessage = messages[messages.length - 1]
    const user = activeUsers.get(username) || persistedUsers.get(username)
    const unreadCount = unreadMessages.get(username) || 0

    const chatUserItem = document.createElement("div")
    chatUserItem.className = "chat-user-item"

    // Add unread class if there are unread messages
    if (unreadCount > 0) {
      chatUserItem.classList.add("has-unread")
    }

    chatUserItem.innerHTML = `
      <div class="chat-user-info" onclick="showChatConversation('${username}')">
        <img src="${user ? user.avatar : "https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png"}" alt="${username}" class="chat-user-avatar">
        <div class="chat-user-details">
          <div class="chat-user-name">${username}</div>
          <div class="chat-last-message">${lastMessage.message.length > 30 ? lastMessage.message.substring(0, 30) + "..." : lastMessage.message}</div>
        </div>
        ${unreadCount > 0 ? `<div class="unread-count">${unreadCount}</div>` : ""}
      </div>
      <div class="chat-user-menu">
        <button class="menu-btn" onclick="showChatMenu(event, '${username}')">⋮</button>
      </div>
    `

    chatUserList.appendChild(chatUserItem)
  })
}

function showChatMenu(event, username) {
  event.stopPropagation()

  // Remove existing menus
  document.querySelectorAll(".menu-dropdown").forEach((menu) => menu.remove())

  const menu = document.createElement("div")
  menu.className = "menu-dropdown"
  menu.innerHTML = `
    <button class="menu-item delete" onclick="confirmDeleteChat('${username}')">Delete Chat</button>
  `

  event.target.parentElement.appendChild(menu)

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener("click", function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove()
        document.removeEventListener("click", closeMenu)
      }
    })
  }, 0)
}

function confirmDeleteChat(username) {
  const confirmation = document.createElement("div")
  confirmation.className = "delete-confirmation"
  confirmation.innerHTML = `
    <div class="delete-confirmation-content">
      <h3>Delete Chat</h3>
      <p>Are you sure you want to delete your conversation with ${username}?</p>
      <div class="delete-options">
        <label class="checkbox-container">
          <input type="checkbox" id="deleteForBoth" />
          <span class="checkmark"></span>
          Also delete for ${username}
        </label>
        <p class="delete-note">If unchecked, the chat will only be deleted for you.</p>
      </div>
      <div class="delete-confirmation-buttons">
        <button class="delete-cancel-btn" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
        <button class="delete-confirm-btn" onclick="deleteChat('${username}')">Delete</button>
      </div>
    </div>
  `

  document.body.appendChild(confirmation)
}

// deleteChat funksiyasini yangilaymiz
function deleteChat(username) {
  const deleteForBoth = document.getElementById("deleteForBoth").checked

  // Remove from local conversations
  conversations.delete(username)

  // Remove unread count
  unreadMessages.delete(username)
  updateUnreadBadge()

  // Send appropriate delete request to server
  if (server) {
    if (deleteForBoth) {
      server.emit("delete_chat", {
        from: currentUsername,
        with: username,
      })
    } else {
      server.emit("delete_chat_for_me", {
        from: currentUsername,
        with: username,
      })
    }
  }

  // Update UI
  updateChatSidebar()
  showChatUserList()

  // Remove confirmation dialog
  document.querySelector(".delete-confirmation").remove()

  if (deleteForBoth) {
    showNotification(`Chat with ${username} deleted for both users`, "info")
  } else {
    showNotification(`Chat with ${username} deleted for you`, "info")
  }
}

function showJoinModal(server) {
  const modal = document.getElementById("joinModal")
  const form = document.getElementById("joinForm")
  const cancelBtn = document.querySelector(".cancel-btn")
  const fileInput = document.getElementById("profileImage")
  const imagePreview = document.getElementById("imagePreview")
  const usernameInput = document.getElementById("username")

  // Show modal
  modal.style.display = "block"

  // Username inputni tozalash va focus qilish
  usernameInput.value = ""
  setTimeout(() => {
    usernameInput.focus()
  }, 100)

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
    let avatar =
      currentUserData.avatar || "https://www.kindpng.com/picc/m/22-223863_no-avatar-png-circle-transparent-png.png"

    // Validation
    if (!username || username.trim() === "") {
      alert("Name is required!")
      usernameInput.focus() // Focus qilish validation dan keyin
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
    joinTime = Date.now()

    // Ma'lumotlarni localStorage ga saqlash
    saveUserDataToStorage()

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
      <button class="welcome-join-btn" onclick="this.parentElement.parentElement.remove(); document.getElementById('joinExitButton').click();">Join Now</button>
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
      <button class="join-alert-btn" onclick="this.parentElement.parentElement.remove(); document.getElementById('joinExitButton').click();">Join Now</button>
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
  if (!hasJoined) {
    showJoinAlert()
    return
  }

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

  // Ma'lumotlarni localStorage ga saqlash
  saveUserDataToStorage()

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

          // Ma'lumotlarni localStorage ga saqlash
          saveUserDataToStorage()

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

    // Update button to Exit mode
    joinExitButton.textContent = "Exit"
    joinExitButton.classList.add("exit-mode")

    // Ensure server is connected
    if (!server.connected) {
      server.connect()
    }

    server.emit("new_user", {
      username: username,
      avatar: avatar,
      coordinates: coordinates,
      bio: currentUserData.bio,
      age: currentUserData.age,
      interests: currentUserData.interests,
      socialLinks: currentUserData.socialLinks,
      joinedAt: joinTime,
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

// Add this after the map.on('load') function
document.addEventListener("DOMContentLoaded", () => {
  const conversationInput = document.getElementById("conversationInput")
  if (conversationInput) {
    conversationInput.addEventListener("input", function () {
      this.style.height = "auto"
      this.style.height = Math.min(this.scrollHeight, 100) + "px"
    })

    conversationInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendConversationMessage()
      }
    })
  }
})

// Make functions global for onclick handlers
window.showSettingsModal = showSettingsModal
window.showSettingsTab = showSettingsTab
window.saveSettings = saveSettings
window.closeSettingsModal = closeSettingsModal
window.toggleChatSidebar = toggleChatSidebar
window.sendMessage = sendMessage
window.showChatConversation = showChatConversation
window.showChatUserList = showChatUserList
window.showChatMenu = showChatMenu
window.confirmDeleteChat = confirmDeleteChat
window.deleteChat = deleteChat
window.sendConversationMessage = sendConversationMessage
