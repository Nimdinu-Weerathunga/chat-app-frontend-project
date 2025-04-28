import { createContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [chatData, setChatData] = useState([]);
  const [messagesId, setMessagesId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [chatVisible,setChatVisible] = useState(false);

  // ✅ Load user data from Firestore
  const loadUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.error(`No user document found for UID: ${uid}`);
        navigate("/");
        return;
      }

      const userData = userSnap.data();
      setUserData(userData);

      if (userData?.avatar && userData?.name) {
        navigate("/chat");
      } else {
        navigate("/profile");
      }

      await updateDoc(userRef, { lastSeen: Date.now() });

    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // ✅ Fetch user chats
  useEffect(() => {
    if (!userData?.id) return; // Prevent running if userData is null

    const chatRef = doc(db, "chats", userData.id);
    
    const unSub = onSnapshot(chatRef, async (res) => {
      if (!res.exists()) {
        console.log("No chats available for this user.");
        setChatData([]); // If no chats exist, set empty array
        return;
      }

      const chatItems = res.data()?.chatData || [];
      console.log("Fetched chat items:", chatItems); // Add logging to check the fetched data

      const tempData = [];

      for (const item of chatItems) {
        try {
          const userRef = doc(db, "users", item.rId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            tempData.push({ ...item, userData: userSnap.data() });
          }
        } catch (error) {
          console.error("Error fetching user data for chat:", error);
        }
      }

      setChatData(tempData.sort((a, b) => b.updatedAt - a.updatedAt));
    });

    return () => unSub();
  }, [userData]);

  return (
    <AppContext.Provider
      value={{
        userData,
        setUserData,
        chatData,
        setChatData,
        loadUserData,
        messages,
        setMessages,
        messagesId,
        setMessagesId,
        chatUser,
        setChatUser,
        chatVisible,setChatVisible
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
