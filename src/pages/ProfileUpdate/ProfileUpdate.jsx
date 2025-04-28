import React, { useContext, useEffect, useState } from 'react';
import './ProfileUpdate.css';
import assets from '../../assets/assets';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import upload from '../../lib/Upload';
import { AppContext } from '../../context/AppContext';

const ProfileUpdate = () => {
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [uid, setUid] = useState('');
  const [prevImage, setPrevImage] = useState('');
  const [loading, setLoading] = useState(false);
  const {setUserData} = useContext(AppContext);

  const profileUpdate = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (!prevImage && !image) {
        toast.error('Please upload a profile picture');
        setLoading(false);
        return;
      }

      const docRef = doc(db, 'users', uid);
      let updates = {
        bio: bio,
        name: name,
      };

      // Add avatar field only if a new image has been uploaded
      if (image) {
        const imgUrl = await upload(image);
        setPrevImage(imgUrl); // Update the local state with the uploaded image URL
        updates.avatar = imgUrl; // Add the avatar field only if image is valid
      } else if (prevImage) {
        updates.avatar = prevImage; // If no new image, keep the previous one
      }

      // Only update avatar if it's a valid value
      if (updates.avatar === undefined) {
        delete updates.avatar; // Remove the avatar field if it's undefined
      }

      // Update the document in Firestore with the prepared updates
      await updateDoc(docRef, updates);

      toast.success('Profile updated successfully');

      const snap = await getDoc(docRef);
      setUserData(snap.data());
      navigate('/chat');

    } catch (error) {
      toast.error('An error occurred while updating the profile');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
};


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        setName(docSnap.data()?.name || '');
        setBio(docSnap.data()?.bio || '');
        setPrevImage(docSnap.data()?.avatar || '');
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type and size before setting it
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a valid image.');
        return;
      }
  
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size exceeds 2MB');
        return;
      }
  
      setImage(file);
    }
  };
  

  return (
    <div className="profile">
      <div className="profile-container">
        <form onSubmit={profileUpdate}>
          <h3>Profile Details</h3>
          <label htmlFor="avatar">
            <input
              onChange={handleFileChange}
              type="file"
              id="avatar"
              accept=".png, .jpg, .jpeg"
              hidden
            />
            <img
              src={image ? URL.createObjectURL(image) : prevImage || assets.avatarIcon}
              alt="Profile"
            />
            Upload profile image
          </label>
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            placeholder="Your name"
            required
          />
          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            placeholder="Write portfolio bio"
          ></textarea>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
        <img
          className="profile-pic"
          src={image ? URL.createObjectURL(image) : prevImage ? prevImage : assets.logoIcon}
          alt="Logo"
        />
      </div>
      <ToastContainer />
    </div>
  );
};

export default ProfileUpdate;
