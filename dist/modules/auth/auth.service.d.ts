export declare class AuthService {
    register(email: string, password: string, name: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
        };
        token: string;
    }>;
    login(email: string, password: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
        };
        token: string;
    }>;
}
