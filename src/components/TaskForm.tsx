import { useState } from "react";
import { auth } from "../services/firebase";
import { createTask, updateTask } from "../services/tasks";
import { analytics } from "../services/analytics";
import { Task } from "../types/task";

interface TaskFormProps {
  task?: Task;
  onSubmit: () => void;
  onCancel: () => void;
}

const TaskForm = ({ task, onSubmit, onCancel }: TaskFormProps) => {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [priority, setPriority] = useState(task?.priority || "medium");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const taskData = {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        status: "pending",
        userId: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (task) {
        // Update existing task
        await updateTask(task.id, taskData);
        analytics.trackTaskEdited({
          task_id: task.id,
          task_type: taskData.priority === "high" ? "work" : "personal",
          priority: taskData.priority,
          due_date: taskData.dueDate || undefined,
          is_completed: false,
        });
      } else {
        // Create new task
        const newTask = await createTask(taskData);
        analytics.trackTaskCreated({
          task_id: newTask.id,
          task_type: taskData.priority === "high" ? "work" : "personal",
          priority: taskData.priority,
          due_date: taskData.dueDate || undefined,
          is_completed: false,
        });
      }

      onSubmit();
    } catch (error) {
      console.error("Error saving task:", error);
      analytics.trackError(error as Error, "TaskForm.handleSubmit");
    }
  };

  // ... rest of your component code ...
};
