import { Task, TaskSection as TaskSectionType } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import TaskItem from "./TaskItem";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
  const filteredTasks = tasks.filter((task) => task.section === section);
  const incompleteTasks = filteredTasks.filter((task) => !task.completed);
  const completedTasks = filteredTasks.filter((task) => task.completed);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[#1A1A1A] dark:text-white">
          {title}
        </h2>
        <span className="text-sm text-[#7E7E7E] dark:text-gray-400">
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
