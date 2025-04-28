import React, { useContext, useEffect, useState } from 'react';
import './RightSidebar.css';
import assets from '../../assets/assets';
import { logout } from '../../config/firebase';
import { AppContext } from '../../context/AppContext';

const RightSidebar = () => {
  const { chatUser, messages } = useContext(AppContext);
  const [msgImages, setMsgImages] = useState([]);

  useEffect(() => {
    // Collect all message images
    let tempVar = [];
    messages.forEach((msg) => {
      if (msg.image) {
        tempVar.push(msg.image);
      }
    });
    setMsgImages(tempVar); // Set the images state
  }, [messages]);

  return chatUser ? (
    <div className='rs'>
      <div className="rs-profile">
        <img src={chatUser.userData.avatar} alt="" />
        <h3>{Date.now()-chatUser.userData.lastSeen <= 70000 ? <img src={assets.greenDot} className='dot' alt="" /> : null}
          {chatUser.userData.name} 
        </h3>
        <p>{chatUser.userData.bio}</p>
      </div>
      <hr />
      <div className="rs-media">
        <p>Media</p>
        <div className="media-images">
          {msgImages.map((image, index) => (
            <img 
              key={index} 
              src={image} 
              alt={`message-${index}`} 
              onClick={() => window.open(image)}  // Corrected here
            />
          ))}
        </div>
      </div>
      <button onClick={() => logout()}>Logout</button>
    </div>
  ) : (
    <div className='rs'>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

export default RightSidebar;