import { Task, TaskSection as TaskSectionType } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import TaskItem from "./TaskItem";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getSectionFromDate } from "@/utils/taskUtils";
import { isAfter } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

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
  const [showCompleted, setShowCompleted] = useState(false);

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
        <div className="mt-4">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-2 text-sm text-[#7E7E7E] dark:text-gray-400 hover:text-[#CDA351] dark:hover:text-[#CDA351] hover:bg-[#CDA351]/5 dark:hover:bg-[#CDA351]/10"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <div className="flex items-center gap-2">
              <span>Completed ({completedTasks.length})</span>
            </div>
            {showCompleted ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-2">
                  {completedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <TaskItem
                        task={task}
                        onUpdate={onUpdateTask}
                        onDelete={onDeleteTask}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default TaskSection;
