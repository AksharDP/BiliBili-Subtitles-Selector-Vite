import { VIP_API_ENDPOINT, PUBLIC_API_ENDPOINT, API_KEY, USER_AGENT } from '../utils/constants';
import { TokenData } from '../types';

// export async function loginWithToken(token: string): Promise<any> {
//     const response = await fetch(`${VIP_API_ENDPOINT}/login`, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Api-Key": API_KEY,
//             "User-Agent": USER_AGENT,
//         },
//         body: JSON.stringify({ token }),
//     });
//     return response.json();
// }

export async function validateToken(token: string): Promise<any> {
    try {
        const response = await fetch(`${PUBLIC_API_ENDPOINT}/infos/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${token}`,
                "User-Agent": USER_AGENT,
            },
        });

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }

        console.log(response);
        
        const data = await response.json();
        return {
            valid: true,
            userData: data.data,
            token: token,
            base_url: 'api.opensubtitles.com'
        };
    } catch (error) {
        console.error('Error validating token:', error);
        return { valid: false, error };
    }
}

export async function checkToken(tokenData: TokenData): Promise<boolean> {
    if (!tokenData?.token) return false;

    const tokenAge = Date.now() - (tokenData.timestamp || 0);
    const isLocallyValid = tokenAge < 30 * 24 * 60 * 60 * 1000; // 30 days

    if (isLocallyValid) return true;

    const apiEndpoint = tokenData.base_url === 'vip-api.opensubtitles.com' ? VIP_API_ENDPOINT : PUBLIC_API_ENDPOINT;
    try {
        const response = await fetch(`${apiEndpoint}/infos/user`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${tokenData.token}`,
                "User-Agent": USER_AGENT,
            },
        });
        return response.ok;
    } catch (error) {
        console.error('Error verifying token with server:', error);
        return true; // Assume valid on network error
    }
}

export async function getUserInfo(tokenData: TokenData): Promise<any> {
    if (!tokenData?.token) return null;

    const apiEndpoint = tokenData.base_url === 'vip-api.opensubtitles.com' ? VIP_API_ENDPOINT : PUBLIC_API_ENDPOINT;
    try {
        const response = await fetch(`${apiEndpoint}/infos/user`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${tokenData.token}`,
                "User-Agent": USER_AGENT,
            },
        });
        return response.json();
    } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
    }
}

