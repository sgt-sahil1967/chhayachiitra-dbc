// Shoot Planner Functionality
const currentDate = new Date()
let currentView = "calendar"
const shootsData = [] // Declare shootsData variable
const brandsData = [] // Declare brandsData variable

document.addEventListener("DOMContentLoaded", () => {
  initializeShootPlanner()
  initializeBrandFilter()
  initializeViewToggle()
  renderCalendar()
})

function initializeShootPlanner() {
  // Calendar navigation
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1)
    renderCalendar()
  })

  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1)
    renderCalendar()
  })
}

function initializeBrandFilter() {
  const brandFilter = document.getElementById("brand-filter")
  if (brandFilter) {
    brandFilter.addEventListener("change", filterShootsByBrand)
  }
}

function initializeViewToggle() {
  document.getElementById("calendar-view").addEventListener("click", () => {
    switchView("calendar")
  })

  document.getElementById("list-view").addEventListener("click", () => {
    switchView("list")
  })
}

function switchView(view) {
  currentView = view
  const calendarContainer = document.getElementById("calendar-container")
  const listContainer = document.getElementById("list-container")
  const calendarBtn = document.getElementById("calendar-view")
  const listBtn = document.getElementById("list-view")

  if (view === "calendar") {
    calendarContainer.style.display = "block"
    listContainer.style.display = "none"
    calendarBtn.classList.add("active")
    listBtn.classList.remove("active")
    renderCalendar()
  } else {
    calendarContainer.style.display = "none"
    listContainer.style.display = "block"
    listBtn.classList.add("active")
    calendarBtn.classList.remove("active")
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
            <div class="day-shoots"></div>
        `

    // Add shoots for this day
    const dayShots = shootsData.filter((shoot) => shoot.shoot_date === day.toISOString().split("T")[0])

    dayShots.forEach((shoot) => {
      const brand = brandsData.find((b) => b.id === shoot.brand_id)
      const shootElement = document.createElement("div")
      shootElement.className = "calendar-shoot"
      shootElement.style.backgroundColor = brand ? brand.color : "#3b82f6"
      shootElement.textContent = shoot.title.length > 15 ? shoot.title.substring(0, 15) + "..." : shoot.title
      shootElement.onclick = () => viewShoot(shoot.id)
      dayElement.querySelector(".day-shoots").appendChild(shootElement)
    })

    // Add click handler for adding shoots
    dayElement.addEventListener("click", (e) => {
      if (e.target === dayElement || e.target.classList.contains("day-number")) {
        openNewShootModal(day.toISOString().split("T")[0])
      }
    })

    calendarGrid.appendChild(dayElement)
  }
}

function filterShootsByBrand() {
  const selectedBrandId = document.getElementById("brand-filter").value
  const shootCards = document.querySelectorAll(".shoot-card")

  shootCards.forEach((card) => {
    if (selectedBrandId === "" || card.dataset.brandId === selectedBrandId) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })

  // Re-render calendar with filtered shoots
  if (currentView === "calendar") {
    renderCalendar()
  }
}

// Modal Functions
function openNewShootModal(date = "") {
  const modal = document.getElementById("shoot-modal")
  const form = document.getElementById("shoot-form")
  const title = document.getElementById("shoot-modal-title")

  // Reset form
  form.reset()
  document.getElementById("shoot-id").value = ""
  if (date) {
    document.getElementById("shoot-date").value = date
  }
  title.textContent = "New Shoot"
  form.action = "/shoots/new"

  // Reset attachments
  const container = document.getElementById("attachments-container")
  container.innerHTML = `
        <div class="attachment-input">
            <input type="text" name="attachments[]" class="form-input" placeholder="https://your-nas-server.com/file1.pdf">
            <button type="button" onclick="removeAttachment(this)" class="btn btn-sm btn-danger" style="margin-left: 0.5rem;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `

  modal.style.display = "block"
}

function closeShootModal() {
  document.getElementById("shoot-modal").style.display = "none"
}

function editShoot(shootId) {
  fetch("/shoots/" + shootId + "/edit")
    .then((response) => response.json())
    .then((shoot) => {
      const modal = document.getElementById("shoot-modal")
      const form = document.getElementById("shoot-form")
      const title = document.getElementById("shoot-modal-title")

      document.getElementById("shoot-id").value = shoot.id
      document.getElementById("shoot-title").value = shoot.title
      document.getElementById("shoot-description").value = shoot.description || ""
      document.getElementById("shoot-brand").value = shoot.brand_id
      document.getElementById("shoot-date").value = shoot.shoot_date
      document.getElementById("shoot-location").value = shoot.location || ""

      // Populate attachments
      const container = document.getElementById("attachments-container")
      container.innerHTML = ""

      if (shoot.attachments && shoot.attachments.length > 0) {
        shoot.attachments.forEach((attachment) => {
          addAttachmentInput(attachment)
        })
      } else {
        addAttachmentInput("")
      }

      title.textContent = "Edit Shoot"
      form.action = "/shoots/" + shootId + "/update"

      modal.style.display = "block"
    })
    .catch((error) => {
      console.error("Error fetching shoot:", error)
    })
}

function viewShoot(shootId) {
  fetch("/shoots/" + shootId + "/view")
    .then((response) => response.json())
    .then((shoot) => {
      const modal = document.getElementById("view-shoot-modal")
      const title = document.getElementById("view-shoot-title")
      const content = document.getElementById("view-shoot-content")

      title.textContent = shoot.title

      const brand = brandsData.find((b) => b.id === shoot.brand_id)
      const shootDate = new Date(shoot.shoot_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      content.innerHTML = `
            <div class="shoot-detail">
                <div class="detail-item">
                    <strong>Brand:</strong>
                    <span style="color: ${brand ? brand.color : "#3b82f6"};">
                        <i class="fas fa-tag"></i> ${brand ? brand.name : "Unknown"}
                    </span>
                </div>
                <div class="detail-item">
                    <strong>Date:</strong>
                    <span><i class="fas fa-calendar"></i> ${shootDate}</span>
                </div>
                ${
                  shoot.location
                    ? `<div class="detail-item">
                    <strong>Location:</strong>
                    <span><i class="fas fa-map-marker-alt"></i> ${shoot.location}</span>
                </div>`
                    : ""
                }
                ${
                  shoot.description
                    ? `<div class="detail-item">
                    <strong>Description:</strong>
                    <p style="margin-top: 0.5rem; color: #6b7280;">${shoot.description}</p>
                </div>`
                    : ""
                }
                ${
                  shoot.attachments && shoot.attachments.length > 0
                    ? `<div class="detail-item">
                    <strong>Attachments:</strong>
                    <div class="attachments-list">
                        ${shoot.attachments
                          .map(
                            (attachment) => `
                            <a href="${attachment}" target="_blank" class="attachment-link">
                                <i class="fas fa-external-link-alt"></i> ${attachment.split("/").pop()}
                            </a>
                        `,
                          )
                          .join("")}
                    </div>
                </div>`
                    : ""
                }
                <div class="detail-actions" style="margin-top: 2rem; display: flex; gap: 1rem;">
                    <button onclick="editShoot(${shoot.id}); closeViewShootModal();" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Edit Shoot
                    </button>
                    <button onclick="deleteShoot(${shoot.id}); closeViewShootModal();" class="btn btn-danger">
                        <i class="fas fa-trash"></i> Delete Shoot
                    </button>
                </div>
            </div>
        `

      modal.style.display = "block"
    })
    .catch((error) => {
      console.error("Error fetching shoot:", error)
    })
}

function closeViewShootModal() {
  document.getElementById("view-shoot-modal").style.display = "none"
}

function deleteShoot(shootId) {
  if (confirm("Are you sure you want to delete this shoot?")) {
    fetch("/shoots/" + shootId + "/delete", {
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
          alert("Error deleting shoot")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        alert("Error deleting shoot")
      })
  }
}

// Attachment Functions
function addAttachment() {
  addAttachmentInput("")
}

function addAttachmentInput(value = "") {
  const container = document.getElementById("attachments-container")
  const div = document.createElement("div")
  div.className = "attachment-input"
  div.innerHTML = `
        <input type="text" name="attachments[]" class="form-input" value="${value}" placeholder="https://your-nas-server.com/file.pdf">
        <button type="button" onclick="removeAttachment(this)" class="btn btn-sm btn-danger" style="margin-left: 0.5rem;">
            <i class="fas fa-times"></i>
        </button>
    `
  container.appendChild(div)
}

function removeAttachment(button) {
  const container = document.getElementById("attachments-container")
  if (container.children.length > 1) {
    button.parentElement.remove()
  }
}

// Close modals when clicking outside
window.onclick = (event) => {
  const shootModal = document.getElementById("shoot-modal")
  const viewModal = document.getElementById("view-shoot-modal")

  if (event.target === shootModal) {
    closeShootModal()
  }
  if (event.target === viewModal) {
    closeViewShootModal()
  }
}

// Close modals with Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeShootModal()
    closeViewShootModal()
  }
})
