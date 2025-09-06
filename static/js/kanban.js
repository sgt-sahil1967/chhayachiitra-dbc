// Kanban Board Functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeKanban()
  initializeBrandFilter()
})

function initializeKanban() {
  const draggables = document.querySelectorAll(".task-card")
  const containers = document.querySelectorAll(".kanban-tasks")

  draggables.forEach((draggable) => {
    draggable.addEventListener("dragstart", handleDragStart)
    draggable.addEventListener("dragend", handleDragEnd)
  })

  containers.forEach((container) => {
    container.addEventListener("dragover", handleDragOver)
    container.addEventListener("drop", handleDrop)
    container.addEventListener("dragenter", handleDragEnter)
    container.addEventListener("dragleave", handleDragLeave)
  })
}

function handleDragStart(e) {
  this.classList.add("dragging")
  e.dataTransfer.setData("text/plain", this.dataset.taskId)
}

function handleDragEnd(e) {
  this.classList.remove("dragging")
}

function handleDragOver(e) {
  e.preventDefault()
  const afterElement = getDragAfterElement(this, e.clientY)
  const dragging = document.querySelector(".dragging")

  if (afterElement == null) {
    this.appendChild(dragging)
  } else {
    this.insertBefore(dragging, afterElement)
  }
}

function handleDragEnter(e) {
  e.preventDefault()
  this.classList.add("drag-over")
  this.parentElement.classList.add("drag-over")
}

function handleDragLeave(e) {
  if (!this.contains(e.relatedTarget)) {
    this.classList.remove("drag-over")
    this.parentElement.classList.remove("drag-over")
  }
}

function handleDrop(e) {
  e.preventDefault()
  this.classList.remove("drag-over")
  this.parentElement.classList.remove("drag-over")

  const taskId = e.dataTransfer.getData("text/plain")
  const newStatus = this.parentElement.dataset.status
  const dragging = document.querySelector(".dragging")

  if (dragging) {
    updateTaskStatus(taskId, newStatus)
    updateTaskCounts()
  }
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

function updateTaskStatus(taskId, newStatus) {
  fetch("/tasks/" + taskId + "/update_status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task_id: Number.parseInt(taskId),
      status: newStatus,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        console.error("Failed to update task status")
        location.reload() // Reload on error to reset state
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      location.reload()
    })
}

function updateTaskCounts() {
  const columns = document.querySelectorAll(".kanban-column")
  columns.forEach((column) => {
    const taskCount = column.querySelectorAll(".task-card").length
    const countElement = column.querySelector(".task-count")
    countElement.textContent = taskCount
  })
}

// Brand Filter Functionality
function initializeBrandFilter() {
  const brandFilter = document.getElementById("brand-filter")
  if (brandFilter) {
    brandFilter.addEventListener("change", filterTasksByBrand)
  }
}

function filterTasksByBrand() {
  const selectedBrandId = document.getElementById("brand-filter").value
  const taskCards = document.querySelectorAll(".task-card")

  taskCards.forEach((card) => {
    if (selectedBrandId === "" || card.dataset.brandId === selectedBrandId) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })

  updateTaskCounts()
}

// Modal Functionality
function openNewTaskModal(status = "todo") {
  const modal = document.getElementById("task-modal")
  const form = document.getElementById("task-form")
  const title = document.getElementById("modal-title")

  // Reset form
  form.reset()
  document.getElementById("task-id").value = ""
  document.getElementById("task-status").value = status
  title.textContent = "New Task"
  form.action = "/tasks/new"

  modal.style.display = "block"
}

function closeTaskModal() {
  const modal = document.getElementById("task-modal")
  modal.style.display = "none"
}

function editTask(taskId) {
  // Fetch task data and populate modal
  fetch("/tasks/" + taskId + "/edit")
    .then((response) => response.json())
    .then((task) => {
      const modal = document.getElementById("task-modal")
      const form = document.getElementById("task-form")
      const title = document.getElementById("modal-title")

      document.getElementById("task-id").value = task.id
      document.getElementById("task-title").value = task.title
      document.getElementById("task-description").value = task.description || ""
      document.getElementById("task-brand").value = task.brand_id
      document.getElementById("task-priority").value = task.priority
      document.getElementById("task-due-date").value = task.due_date || ""
      document.getElementById("task-status").value = task.status

      title.textContent = "Edit Task"
      form.action = "/tasks/" + taskId + "/update"

      modal.style.display = "block"
    })
    .catch((error) => {
      console.error("Error fetching task:", error)
    })
}

function deleteTask(taskId) {
  if (confirm("Are you sure you want to delete this task?")) {
    fetch("/tasks/" + taskId + "/delete", {
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
          alert("Error deleting task")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        alert("Error deleting task")
      })
  }
}

// Close modal when clicking outside
window.onclick = (event) => {
  const modal = document.getElementById("task-modal")
  if (event.target === modal) {
    closeTaskModal()
  }
}

// Close modal with Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeTaskModal()
  }
})
