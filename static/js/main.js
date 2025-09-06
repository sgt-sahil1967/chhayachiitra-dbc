// Main JavaScript functionality
document.addEventListener("DOMContentLoaded", () => {
  // Auto-hide flash messages after 5 seconds
  const flashMessages = document.querySelectorAll(".flash-message")
  flashMessages.forEach((message) => {
    setTimeout(() => {
      message.style.opacity = "0"
      setTimeout(() => {
        message.remove()
      }, 300)
    }, 5000)
  })

  // Mobile navigation toggle
  const navToggle = document.querySelector(".nav-toggle")
  const navMenu = document.querySelector(".nav-menu")

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active")
    })
  }
})

// Task status update function
function updateTaskStatus(taskId, newStatus) {
  fetch("/tasks/" + taskId + "/update_status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task_id: taskId,
      status: newStatus,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        location.reload()
      }
    })
    .catch((error) => {
      console.error("Error:", error)
    })
}

// Drag and drop functionality for Kanban board
function initializeDragAndDrop() {
  const draggables = document.querySelectorAll(".task-card")
  const containers = document.querySelectorAll(".task-column")

  draggables.forEach((draggable) => {
    draggable.addEventListener("dragstart", () => {
      draggable.classList.add("dragging")
    })

    draggable.addEventListener("dragend", () => {
      draggable.classList.remove("dragging")
    })
  })

  containers.forEach((container) => {
    container.addEventListener("dragover", (e) => {
      e.preventDefault()
      const afterElement = getDragAfterElement(container, e.clientY)
      const dragging = document.querySelector(".dragging")

      if (afterElement == null) {
        container.appendChild(dragging)
      } else {
        container.insertBefore(dragging, afterElement)
      }
    })

    container.addEventListener("drop", (e) => {
      e.preventDefault()
      const dragging = document.querySelector(".dragging")
      const newStatus = container.dataset.status
      const taskId = dragging.dataset.taskId

      updateTaskStatus(taskId, newStatus)
    })
  })
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".task-card:not(.dragging)")]

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect()
      const offset = y - box.top - box.height / 2

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child }
      } else {
        return closest
      }
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element
}

// Initialize drag and drop when page loads
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".task-column")) {
    initializeDragAndDrop()
  }
})
