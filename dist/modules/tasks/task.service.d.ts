import ExcelJS from 'exceljs';
interface CreateTaskData {
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dueDate?: string;
}
export declare class TaskService {
    createTask(userId: string, data: CreateTaskData): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.Status;
        description: string | null;
        title: string;
        priority: import(".prisma/client").$Enums.Priority;
        dueDate: Date | null;
        estimatedHours: number | null;
        actualHours: number | null;
        tags: string[];
        creatorId: string;
        assigneeId: string | null;
    }>;
    getTasks(userId: string, status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE', dueDate?: 'today' | 'overdue', page?: number, limit?: number): Promise<{
        tasks: ({
            creator: {
                id: string;
                email: string;
                name: string;
            };
            assignee: {
                id: string;
                email: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.Status;
            description: string | null;
            title: string;
            priority: import(".prisma/client").$Enums.Priority;
            dueDate: Date | null;
            estimatedHours: number | null;
            actualHours: number | null;
            tags: string[];
            creatorId: string;
            assigneeId: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getTaskById(userId: string, taskId: string): Promise<{
        creator: {
            id: string;
            email: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.Status;
        description: string | null;
        title: string;
        priority: import(".prisma/client").$Enums.Priority;
        dueDate: Date | null;
        estimatedHours: number | null;
        actualHours: number | null;
        tags: string[];
        creatorId: string;
        assigneeId: string | null;
    }>;
    updateTask(userId: string, taskId: string, data: {
        title?: string;
        description?: string;
        status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        dueDate?: string | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.Status;
        description: string | null;
        title: string;
        priority: import(".prisma/client").$Enums.Priority;
        dueDate: Date | null;
        estimatedHours: number | null;
        actualHours: number | null;
        tags: string[];
        creatorId: string;
        assigneeId: string | null;
    }>;
    deleteTask(userId: string, taskId: string): Promise<{
        message: string;
    }>;
    assignTask(userId: string, taskId: string, assigneeId: string): Promise<{
        assignee: {
            id: string;
            email: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.Status;
        description: string | null;
        title: string;
        priority: import(".prisma/client").$Enums.Priority;
        dueDate: Date | null;
        estimatedHours: number | null;
        actualHours: number | null;
        tags: string[];
        creatorId: string;
        assigneeId: string | null;
    }>;
    exportTasks(userId: string): Promise<ExcelJS.Buffer>;
    importTasks(userId: string, buffer: Buffer): Promise<{
        imported: number;
        tasks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.Status;
            description: string | null;
            title: string;
            priority: import(".prisma/client").$Enums.Priority;
            dueDate: Date | null;
            estimatedHours: number | null;
            actualHours: number | null;
            tags: string[];
            creatorId: string;
            assigneeId: string | null;
        }[];
    }>;
    getAnalytics(userId: string): Promise<{
        total: number;
        todo: number;
        inProgress: number;
        review: number;
        done: number;
        overdue: number;
        completionRate: number;
    }>;
    addDependency(userId: string, taskId: string, blockingTaskId: string): Promise<{
        blockedTask: {
            id: string;
            status: import(".prisma/client").$Enums.Status;
            title: string;
        };
        blockingTask: {
            id: string;
            status: import(".prisma/client").$Enums.Status;
            title: string;
        };
    } & {
        id: string;
        createdAt: Date;
        blockedTaskId: string;
        blockingTaskId: string;
    }>;
    getDependencies(userId: string, taskId: string): Promise<({
        blockingTask: {
            id: string;
            status: import(".prisma/client").$Enums.Status;
            title: string;
            priority: import(".prisma/client").$Enums.Priority;
            dueDate: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        blockedTaskId: string;
        blockingTaskId: string;
    })[]>;
    removeDependency(userId: string, taskId: string, dependencyId: string): Promise<{
        message: string;
    }>;
}
export {};
