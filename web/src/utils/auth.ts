import { Amplify } from 'aws-amplify';

export const configureAuth = () => {
    const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
    const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

    // Validate required environment variables
    if (!userPoolId || !userPoolClientId) {
        console.error('Missing Cognito configuration:', {
            userPoolId: userPoolId ? 'set' : 'MISSING',
            userPoolClientId: userPoolClientId ? 'set' : 'MISSING'
        });
        throw new Error(
            'Auth UserPool not configured. Please check your .env file:\n' +
            '- VITE_COGNITO_USER_POOL_ID\n' +
            '- VITE_COGNITO_CLIENT_ID\n\n' +
            'Run: cd infra && terraform output to get these values'
        );
    }

    console.log('Configuring Amplify Auth with:', {
        userPoolId,
        userPoolClientId: userPoolClientId.substring(0, 8) + '...'
    });

    Amplify.configure({
        Auth: {
            Cognito: {
                userPoolId,
                userPoolClientId,
            }
        }
    });
};
