import { USERS_URL } from '../config/config';

export const searchUsers = async (
    searchTerm: string,
    setUsers: React.Dispatch<React.SetStateAction<any[]>>,
    axiosPrivate: any,
) => {
    try {
        if (!searchTerm) return;
        const res = await axiosPrivate.get(
            USERS_URL + `/search?username=${searchTerm}`,
        );
        setUsers(res.data.data.users);
    } catch (error) {
        console.log(error);
    }
};
