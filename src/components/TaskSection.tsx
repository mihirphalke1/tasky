import { Task, TaskSection as TaskSectionType } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import TaskItem from "./TaskItem";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getSectionFromDate } from "@/utils/taskUtils";
import { isAfter } from "date-fns";

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  section: TaskSectionType;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDragEnd: (result: any) => void;
}

const TaskSection = ({
  title,
  tasks,
  section,
  onUpdateTask,
  onDeleteTask,
  onDragEnd,
}: TaskSectionProps) => {
  // Priority order for sorting (high first, then medium, then low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  // Filter out snoozed tasks that haven't reached their snooze time yet
  const filterActiveTasks = (taskList: Task[]) => {
    return taskList.filter((task) => {
      // Include all tasks, even if they are snoozed
      return true;
    });
  };

  // Only use getSectionFromDate for incomplete tasks and sort by priority
  const incompleteTasks = filterActiveTasks(
    tasks.filter(
      (task) => !task.completed && getSectionFromDate(task.dueDate) === section
    )
  ).sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then sort by lastModified (most recent first)
    return b.lastModified.getTime() - a.lastModified.getTime();
  });

  const completedTasks = filterActiveTasks(
    tasks.filter(
      (task) => task.completed && getSectionFromDate(task.dueDate) === section
    )
  ).sort((a, b) => {
    // For completed tasks, sort by completion time (most recent first)
    return b.lastModified.getTime() - a.lastModified.getTime();
  });

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-[#1A1A1A] dark:text-white">
          {title}
        </h2>
        <span className="text-xs sm:text-sm text-[#7E7E7E] dark:text-gray-400">
          {incompleteTasks.length} remaining
        </span>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={section}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-3"
            >
              <AnimatePresence>
                {incompleteTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <TaskItem
                          task={task}
                          onUpdate={onUpdateTask}
                          onDelete={onDeleteTask}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {completedTasks.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-[#7E7E7E] dark:text-gray-400">
              Completed
            </h3>
            <span className="text-xs text-[#7E7E7E] dark:text-gray-400">
              ({completedTasks.length})
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {completedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TaskItem
                    task={task}
                    onUpdate={onUpdateTask}
                    onDelete={onDeleteTask}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskSection;
