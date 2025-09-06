// Content Calendar and Folder System
const currentDate = new Date()
let currentView = "calendar"
let currentFolder = ""
const contentData = [] // Declare contentData variable
const brandsData = [] // Declare brandsData variable

document.addEventListener("DOMContentLoaded", () => {
  initializeContentSystem()
  initializeBrandFilter()
  initializeViewToggle()
  renderCalendar()
  renderFolders()
})

function initializeContentSystem() {
  // Calendar navigation
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1)
    renderCalendar()
  })

  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1)
    renderCalendar()
  })

  // Folder form submission
  document.getElementById("folder-form").addEventListener("submit", (e) => {
    e.preventDefault()
    createFolder()
  })
}

function initializeBrandFilter() {
  const brandFilter = document.getElementById("brand-filter")
  if (brandFilter) {
    brandFilter.addEventListener("change", filterContentByBrand)
  }
}

function initializeViewToggle() {
  document.getElementById("calendar-view").addEventListener("click", () => {
    switchView("calendar")
  })

  document.getElementById("folder-view").addEventListener("click", () => {
    switchView("folder")
  })
}

function switchView(view) {
  currentView = view
  const calendarContainer = document.getElementById("calendar-container")
  const folderContainer = document.getElementById("folder-container")
  const calendarBtn = document.getElementById("calendar-view")
  const folderBtn = document.getElementById("folder-view")

  if (view === "calendar") {
    calendarContainer.style.display = "block"
    folderContainer.style.display = "none"
    calendarBtn.classList.add("active")
    folderBtn.classList.remove("active")
    renderCalendar()
  } else {
    calendarContainer.style.display = "none"
    folderContainer.style.display = "block"
    folderBtn.classList.add("active")
    calendarBtn.classList.remove("active")
    renderFolders()
  }
}

function renderCalendar() {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Update month header
  document.getElementById("current-month").textContent =
    `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  // Clear existing calendar days
  const calendarGrid = document.querySelector(".calendar-grid")
  const existingDays = calendarGrid.querySelectorAll(".calendar-day")
  existingDays.forEach((day) => day.remove())

  // Get first day of month and number of days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  // Generate calendar days
  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)

    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day"
    dayElement.dataset.date = day.toISOString().split("T")[0]

    if (day.getMonth() !== currentDate.getMonth()) {
      dayElement.classList.add("other-month")
    }

    if (day.toDateString() === new Date().toDateString()) {
      dayElement.classList.add("today")
    }

    dayElement.innerHTML = `
            <div class="day-number">${day.getDate()}</div>
            <div class="day-content"></div>
        `

    // Add content items for this day
    const dayContent = contentData.filter((item) => {
      const itemDate = new Date(item.created_at).toISOString().split("T")[0]
      return itemDate === day.toISOString().split("T")[0]
    })

    dayContent.forEach((item) => {
      const brand = brandsData.find((b) => b.id === item.brand_id)
      const contentElement = document.createElement("div")
      contentElement.className = "calendar-content"
      contentElement.style.backgroundColor = brand ? brand.color : "#3b82f6"
      contentElement.innerHTML = `
                <i class="fas fa-${getContentIcon(item.content_type)}"></i>
                <span>${item.title.length > 12 ? item.title.substring(0, 12) + "..." : item.title}</span>
            `
      contentElement.onclick = () => viewContentItem(item.id)
      dayElement.querySelector(".day-content").appendChild(contentElement)
    })

    // Add click handler for adding content
    dayElement.addEventListener("click", (e) => {
      if (e.target === dayElement || e.target.classList.contains("day-number")) {
        openNewContentModal()
      }
    })

    calendarGrid.appendChild(dayElement)
  }
}

function renderFolders() {
  const foldersGrid = document.getElementById("folders-grid")
  const contentItemsGrid = document.getElementById("content-items-grid")

  // Get unique folders
  const folders = new Set()
  contentData.forEach((item) => {
    if (item.folder_path) {
      const parts = item.folder_path.split("/")
      let currentPath = ""
      parts.forEach((part) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        if (currentPath.startsWith(currentFolder) && currentPath !== currentFolder) {
          const relativePath = currentPath.substring(currentFolder.length)
          const nextFolder = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath
          if (!nextFolder.includes("/")) {
            folders.add(currentPath)
          }
        }
      })
    }
  })

  // Render folders
  foldersGrid.innerHTML = ""
  folders.forEach((folderPath) => {
    const folderName = folderPath.split("/").pop()
    const folderElement = document.createElement("div")
    folderElement.className = "folder-item"
    folderElement.innerHTML = `
            <div class="folder-icon">
                <i class="fas fa-folder"></i>
            </div>
            <div class="folder-name">${folderName}</div>
        `
    folderElement.onclick = () => navigateToFolder(folderPath)
    foldersGrid.appendChild(folderElement)
  })

  // Filter content items for current folder
  const filteredContent = contentData.filter((item) => {
    if (currentFolder === "") {
      return !item.folder_path || !item.folder_path.includes("/")
    }
    return item.folder_path === currentFolder
  })

  // Update content items display
  const contentCards = document.querySelectorAll(".content-item-card")
  contentCards.forEach((card) => {
    const cardFolder = card.dataset.folder || ""
    if (currentFolder === "" && (!cardFolder || !cardFolder.includes("/"))) {
      card.style.display = "block"
    } else if (cardFolder === currentFolder) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })
}

function navigateToFolder(folderPath) {
  currentFolder = folderPath
  updateBreadcrumb()
  renderFolders()
}

function updateBreadcrumb() {
  const breadcrumb = document.querySelector(".breadcrumb")
  breadcrumb.innerHTML = ""

  // Add home breadcrumb
  const homeItem = document.createElement("span")
  homeItem.className = "breadcrumb-item"
  homeItem.innerHTML = '<i class="fas fa-home"></i> All Content'
  homeItem.onclick = () => navigateToFolder("")
  breadcrumb.appendChild(homeItem)

  if (currentFolder) {
    const parts = currentFolder.split("/")
    let currentPath = ""

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part

      const separator = document.createElement("span")
      separator.className = "breadcrumb-separator"
      separator.textContent = "/"
      breadcrumb.appendChild(separator)

      const item = document.createElement("span")
      item.className = index === parts.length - 1 ? "breadcrumb-item active" : "breadcrumb-item"
      item.textContent = part
      if (index < parts.length - 1) {
        item.onclick = () => navigateToFolder(currentPath)
      }
      breadcrumb.appendChild(item)
    })
  } else {
    document.querySelector(".breadcrumb-item").classList.add("active")
  }
}

function filterContentByBrand() {
  const selectedBrandId = document.getElementById("brand-filter").value
  const contentCards = document.querySelectorAll(".content-item-card")

  contentCards.forEach((card) => {
    if (selectedBrandId === "" || card.dataset.brandId === selectedBrandId) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })

  // Re-render calendar with filtered content
  if (currentView === "calendar") {
    renderCalendar()
  }
}

function getContentIcon(contentType) {
  switch (contentType) {
    case "image":
      return "image"
    case "video":
      return "video"
    case "document":
      return "file-alt"
    case "audio":
      return "music"
    default:
      return "file"
  }
}

// Modal Functions
function openNewContentModal() {
  const modal = document.getElementById("content-modal")
  const form = document.getElementById("content-form")
  const title = document.getElementById("content-modal-title")

  // Reset form
  form.reset()
  document.getElementById("content-id").value = ""
  title.textContent = "New Content Item"
  form.action = "/content/new"

  // Set current folder if in folder view
  if (currentView === "folder" && currentFolder) {
    document.getElementById("content-folder").value = currentFolder
  }

  modal.style.display = "block"
}

function closeContentModal() {
  document.getElementById("content-modal").style.display = "none"
}

function editContentItem(contentId) {
  fetch("/content/" + contentId + "/edit")
    .then((response) => response.json())
    .then((item) => {
      const modal = document.getElementById("content-modal")
      const form = document.getElementById("content-form")
      const title = document.getElementById("content-modal-title")

      document.getElementById("content-id").value = item.id
      document.getElementById("content-title").value = item.title
      document.getElementById("content-description").value = item.description || ""
      document.getElementById("content-brand").value = item.brand_id
      document.getElementById("content-type").value = item.content_type
      document.getElementById("content-url").value = item.file_url
      document.getElementById("content-folder").value = item.folder_path || ""

      title.textContent = "Edit Content Item"
      form.action = "/content/" + contentId + "/update"

      modal.style.display = "block"
    })
    .catch((error) => {
      console.error("Error fetching content item:", error)
    })
}

function viewContentItem(contentId) {
  const item = contentData.find((c) => c.id === contentId)
  if (item) {
    window.open(item.file_url, "_blank")
  }
}

function deleteContentItem(contentId) {
  if (confirm("Are you sure you want to delete this content item?")) {
    fetch("/content/" + contentId + "/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          location.reload()
        } else {
          alert("Error deleting content item")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        alert("Error deleting content item")
      })
  }
}

function openNewFolderModal() {
  const modal = document.getElementById("folder-modal")
  const form = document.getElementById("folder-form")

  form.reset()
  if (currentFolder) {
    document.getElementById("folder-parent").value = currentFolder
  }

  modal.style.display = "block"
}

function closeFolderModal() {
  document.getElementById("folder-modal").style.display = "none"
}

function createFolder() {
  const folderName = document.getElementById("folder-name").value
  const parentPath = document.getElementById("folder-parent").value

  const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName

  // For now, just close the modal and show a message
  // In a real implementation, you might want to save folder structure to the database
  alert(`Folder "${fullPath}" created! You can now use this path when adding content items.`)
  closeFolderModal()
}

// Close modals when clicking outside
window.onclick = (event) => {
  const contentModal = document.getElementById("content-modal")
  const folderModal = document.getElementById("folder-modal")

  if (event.target === contentModal) {
    closeContentModal()
  }
  if (event.target === folderModal) {
    closeFolderModal()
  }
}

// Close modals with Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeContentModal()
    closeFolderModal()
  }
})
