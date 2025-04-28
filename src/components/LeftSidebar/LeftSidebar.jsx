import React, { useContext, useEffect, useState } from "react";
import "./LeftSidebar.css";
import assets from "../../assets/assets";
import { useNavigate } from "react-router-dom";
import { 
  collection, doc, getDocs, query, where, serverTimestamp, 
  setDoc, updateDoc, arrayUnion, onSnapshot, getDoc 
} from "firebase/firestore";
import { AppContext } from "../../context/AppContext";
import { db } from "../../config/firebase";
import { toast } from "react-toastify";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const { 
    userData, chatData, setChatUser, setMessagesId, 
    setChatData, chatVisible, setChatVisible, chatUser 
  } = useContext(AppContext);
  
  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Real-time chat updates
  useEffect(() => {
    if (!userData?.id) return;

    const chatRef = doc(db, "chats", userData.id);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        setChatData(docSnap.data().chatData); // 🔥 Update chatData in real-time
      }
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [userData?.id, setChatData]);

  // ✅ Search user by username
  const inputHandler = async (e) => {
    const input = e.target.value.trim();

    if (!input) {
      setShowSearch(false);
      setUser(null);
      return;
    }

    setLoading(true);
    try {
      setShowSearch(true);
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", input.toLowerCase()));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const fetchedUser = querySnap.docs[0].data();
        setUser(fetchedUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      toast.error("Failed to search user. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const addChat = async () => {
    if (!user) return;
  
    try {
      const messagesRef = collection(db, "messages");
      const chatsRef = collection(db, "chats");
  
      const newMessagesDoc = doc(messagesRef);
      await setDoc(newMessagesDoc, { createdAt: serverTimestamp(), messages: [] });
  
      const lastMessage = "New chat started"; // No input, just starting a chat
  
      const newChat = {
        messageId: newMessagesDoc.id,
        lastMessage: lastMessage, 
        rId: user.id,
        updatedAt: Date.now(),
        messageSeen: true,
        userData: user,
      };
  
      await Promise.all([
        updateDoc(doc(chatsRef, userData.id), { chatData: arrayUnion(newChat) }),
        updateDoc(doc(chatsRef, user.id), { chatData: arrayUnion({ ...newChat, rId: userData.id }) }),
      ]);
  
      toast.success("Chat added successfully!");
      setUser(null);
      setShowSearch(false);

      const uSnap = await getDoc(doc(db, "users", user.id));
      const uData = uSnap.data();

      setChatUser({
        messagesId: newMessagesDoc.id,
        lastMessage: "",
        rId: user.id,
        updatedAt: Date.now(),
        messageSeen: true,
        userData: uData
      });

      setChatVisible(true);
    } catch (error) {
      console.error("Error adding chat:", error);
      toast.error("Failed to add chat. Please try again.");
    }
  };

  const setChat = async (chat) => {
    setMessagesId(chat.messageId);
    setChatUser(chat);
  
    const userChatsRef = doc(db, 'chats', userData.id);
    const userChatsSnapshot = await getDoc(userChatsRef);
    const userChatsData = userChatsSnapshot.data();
    
    if (!userChatsData || !userChatsData.chatData) return;

    const chatIndex = userChatsData.chatData.findIndex((c) => c.messageId === chat.messageId);
    if (chatIndex === -1) return;

    userChatsData.chatData[chatIndex].messageSeen = true;
  
    await updateDoc(userChatsRef, {
      chatData: userChatsData.chatData
    });

    setChatVisible(true);
  };

  // ✅ Fix: Ensure chatUser is defined before accessing properties
  useEffect(() => {
    const updateChatUserData = async () => {
      if (!chatUser || !chatUser.userData?.id) return;

      const userRef = doc(db, "users", chatUser.userData.id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setChatUser((prev) => ({ ...prev, userData }));
      }
    };

    updateChatUserData();
  }, [chatData, chatUser]);

  return (
    <div className={`ls ${chatVisible ? "hidden" : ""}`}>
      <div className="ls-top">
        <div className="ls-nav">
          <img src={assets.logo} className="logo" alt="Logo" />
        </div>
        <div className="ls-search">
          <input onChange={inputHandler} type="text" placeholder="Search here..." />
        </div>
      </div>
      <div className="ls-list">
        {loading ? (
          <p>Loading...</p>
        ) : showSearch && user ? (
          <div onClick={addChat} className="friends add-user">
            <img src={user.avatar || assets.avatarIcon} alt="Avatar" />
            <p>{user.name || "Unknown User"}</p>
          </div>
        ) : chatData.length > 0 ? (
          chatData.map((chat) => (
            <div
              key={chat.messageId}
              onClick={() => setChat(chat)}
              className={`friends ${chat.messageSeen ? "" : "border"}`}
            >
              <img src={chat.userData?.avatar || assets.profileImage} alt="Profile" />
              <div className="chat-info">
                <p>{chat.userData?.name || "Unknown User"}</p>
                <span className="last-message">{chat.lastMessage || "No messages yet"}</span>
              </div>
            </div>
          ))
        ) : (
          <p>No chats available.</p>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
