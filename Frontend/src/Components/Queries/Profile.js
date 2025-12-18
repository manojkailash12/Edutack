import React, { useState, useRef } from "react";
import UserContext from "../../Hooks/UserContext";
import Loading from "../Layouts/Loading";
import axios from "../../config/api/axios";
import { PiUserThin, PiStudentThin } from "react-icons/pi";
import { FaCamera, FaUpload, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

const Profile = () => {
  const { user } = React.useContext(UserContext);
  const [profile, setProfile] = React.useState({});
  const [showChangePwd, setShowChangePwd] = React.useState(false);
  const [pwdForm, setPwdForm] = React.useState({ previousPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMsg, setPwdMsg] = React.useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);


  React.useEffect(() => {
    const getProfile = async () => {
      try {
        const response = await axios.get(`${user.userType}/${user._id}`);
        setProfile(response.data);
        
        // Set profile photo if exists
        if (response.data.profilePhoto) {
          // Construct full URL for profile photo
          const baseUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3500';
          let photoUrl;
          
          console.log('Profile photo from backend:', response.data.profilePhoto);
          console.log('Base URL:', baseUrl);
          
          if (response.data.profilePhoto.startsWith('data:image/')) {
            // Base64 image data
            photoUrl = response.data.profilePhoto;
          } else if (response.data.profilePhoto.startsWith('http')) {
            photoUrl = response.data.profilePhoto;
          } else {
            // Legacy file path - normalize the path and ensure it starts with uploads/
            let normalizedPath = response.data.profilePhoto.replace(/\\/g, '/');
            if (!normalizedPath.startsWith('uploads/')) {
              normalizedPath = `uploads/profile-photos/${normalizedPath}`;
            }
            photoUrl = `${baseUrl}/${normalizedPath}`;
          }
          
          console.log('Constructed photo URL:', photoUrl);
          setPhotoPreview(photoUrl);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    getProfile();
  }, [user]);



  const handlePwdChange = (e) => {
    setPwdForm({ ...pwdForm, [e.target.name]: e.target.value });
  };

  const submitPwdChange = async (e) => {
    e.preventDefault();
    setPwdMsg('');
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg('New passwords do not match');
      return;
    }
    try {
      const url = `/${user.userType}/${user._id}/change-password`;
      console.log('Attempting to change password with URL:', url);
      console.log('Request data:', {
        previousPassword: pwdForm.previousPassword ? '[PROVIDED]' : '[MISSING]',
        newPassword: pwdForm.newPassword ? '[PROVIDED]' : '[MISSING]',
      });
      
      const response = await axios.patch(url, {
        previousPassword: pwdForm.previousPassword,
        newPassword: pwdForm.newPassword,
      });
      
      console.log('Password change response:', response.data);
      setPwdMsg('Password changed successfully!');
      setPwdForm({ previousPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePwd(false);
      toast.success('Password changed successfully!');
    } catch (err) {
      console.error('Password change error:', err);
      console.error('Error response:', err?.response?.data);
      const errorMessage = err?.response?.data?.message || 'Error changing password';
      setPwdMsg(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setProfilePhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePhoto = async () => {
    if (!profilePhoto) {
      toast.error('Please select a photo first');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('profilePhoto', profilePhoto);
      
      const response = await axios.patch(`/${user.userType}/${user._id}/profile-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Profile photo updated successfully!');
      setProfilePhoto(null);
      
      // Update profile data
      if (response.data.profilePhoto) {
        // Construct full URL for profile photo
        const baseUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3500';
        let photoUrl;
        
        if (response.data.profilePhoto.startsWith('data:image/')) {
          // Base64 image data
          photoUrl = response.data.profilePhoto;
        } else if (response.data.profilePhoto.startsWith('http')) {
          photoUrl = response.data.profilePhoto;
        } else {
          // Legacy file path - normalize the path and ensure it starts with uploads/
          let normalizedPath = response.data.profilePhoto.replace(/\\/g, '/');
          if (!normalizedPath.startsWith('uploads/')) {
            normalizedPath = `uploads/profile-photos/${normalizedPath}`;
          }
          photoUrl = `${baseUrl}/${normalizedPath}`;
        }
        
        setPhotoPreview(photoUrl);
      }
      
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error uploading profile photo');
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePhoto = async () => {
    try {
      setUploading(true);
      
      await axios.delete(`/${user.userType}/${user._id}/profile-photo`);
      
      toast.success('Profile photo removed successfully!');
      setPhotoPreview(null);
      setProfilePhoto(null);
      
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error removing profile photo');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <main className="flex w-full flex-col justify-center md:w-fit">
      {profile.name ? (
        <>
          <div className="my-4 flex w-full justify-center overflow-auto dark:border-slate-500 dark:p-[1px]">
            {/* Profile Photo Section */}
            <div className="relative mr-4">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="m-2 rounded-full border-2 border-slate-900 w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 object-cover dark:border-slate-300"
                    onError={(e) => {
                      console.error('Image failed to load:', photoPreview);
                      console.error('Error event:', e);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', photoPreview);
                    }}
                  />
                  <div className="absolute bottom-0 right-0 flex space-x-1">
                    <button
                      onClick={triggerFileInput}
                      className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded-full transition-colors"
                      title="Change Photo"
                    >
                      <FaCamera className="w-3 h-3" />
                    </button>
                    <button
                      onClick={removeProfilePhoto}
                      disabled={uploading}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors disabled:opacity-50"
                      title="Remove Photo"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {user.userType === "staff" ? (
                    <PiUserThin className="m-2 rounded-full border-2 border-slate-900 p-1 text-6xl dark:border-slate-300 md:p-2 md:text-9xl lg:text-[12rem]" />
                  ) : (
                    <PiStudentThin className="m-2 rounded-full border-2 border-slate-900 p-1 text-6xl font-light dark:border-slate-300 md:p-2 md:text-9xl lg:text-[12rem]" />
                  )}
                  <button
                    onClick={triggerFileInput}
                    className="absolute bottom-0 right-0 bg-violet-600 hover:bg-violet-700 text-white p-2 rounded-full transition-colors"
                    title="Add Photo"
                  >
                    <FaCamera className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-col items-start justify-center">
              <h2 className="whitespace-break-spaces text-3xl font-bold text-violet-950 underline decoration-inherit decoration-2 underline-offset-4 dark:mt-0 dark:text-slate-400 md:text-6xl">
                {user?.name}
              </h2>
              <p className="text-lg capitalize sm:text-xl md:text-2xl">
                {user?.role}
              </p>
            </div>
          </div>

          {/* Photo Upload Section */}
          {profilePhoto && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Upload Profile Photo
              </h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={uploadProfilePhoto}
                  disabled={uploading}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FaUpload />
                  <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                </button>
                <button
                  onClick={() => {
                    setProfilePhoto(null);
                    if (profile.profilePhoto) {
                      const baseUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3500';
                      let photoUrl;
                      
                      if (profile.profilePhoto.startsWith('data:image/')) {
                        // Base64 image data
                        photoUrl = profile.profilePhoto;
                      } else if (profile.profilePhoto.startsWith('http')) {
                        photoUrl = profile.profilePhoto;
                      } else {
                        // Legacy file path - normalize the path and ensure it starts with uploads/
                        let normalizedPath = profile.profilePhoto.replace(/\\/g, '/');
                        if (!normalizedPath.startsWith('uploads/')) {
                          normalizedPath = `uploads/profile-photos/${normalizedPath}`;
                        }
                        photoUrl = `${baseUrl}/${normalizedPath}`;
                      }
                      
                      setPhotoPreview(photoUrl);
                    } else {
                      setPhotoPreview(null);
                    }
                  }}
                  disabled={uploading}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="w-full overflow-auto rounded-md border-2 border-slate-900 dark:border-slate-500 dark:p-[1px]">
            <table className="w-full">
              <tbody>
                {Object.keys(profile).filter(key => key !== 'profilePhoto').map((key, index) => (
                  <tr
                    key={index}
                    className="border-t first:border-t-0 border-slate-400 last:border-b-0"
                  >
                    <th className="bg-slate-900 p-4 text-base capitalize text-slate-100">
                      {key}
                    </th>
                    <td className="px-4 py-2">
                      {key === 'salary' || key === 'baseSalary' || key === 'dailyRate' || key === 'hourlyRate' 
                        ? `Rs. ${(profile[key] || 0).toLocaleString('en-IN')}` 
                        : profile[key]}
                    </td>
                  </tr>
                ))}
                
                {/* Add salary information section for staff */}
                {user.userType === 'staff' && profile.salary && (
                  <>
                    <tr className="border-t border-slate-400 bg-blue-50 dark:bg-blue-900/20">
                      <th colSpan="2" className="bg-blue-600 p-3 text-base font-semibold text-white text-center">
                        Salary Information
                      </th>
                    </tr>
                    <tr className="border-t border-slate-400">
                      <th className="bg-slate-900 p-4 text-base text-slate-100">
                        Monthly Salary
                      </th>
                      <td className="px-4 py-2 font-semibold text-green-600">
                        Rs. {(profile.salary || profile.baseSalary || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-400">
                      <th className="bg-slate-900 p-4 text-base text-slate-100">
                        Salary Type
                      </th>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          profile.salaryType === 'attendance-based' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {profile.salaryType === 'attendance-based' ? 'Attendance-Based' : 'Fixed Salary'}
                        </span>
                      </td>
                    </tr>
                    {profile.salaryType === 'attendance-based' && (
                      <>
                        <tr className="border-t border-slate-400">
                          <th className="bg-slate-900 p-4 text-base text-slate-100">
                            Daily Rate
                          </th>
                          <td className="px-4 py-2">
                            Rs. {(profile.dailyRate || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr className="border-t border-slate-400">
                          <th className="bg-slate-900 p-4 text-base text-slate-100">
                            Hourly Rate
                          </th>
                          <td className="px-4 py-2">
                            Rs. {(profile.hourlyRate || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </>
                    )}
                    {profile.joiningDate && (
                      <tr className="border-t border-slate-400">
                        <th className="bg-slate-900 p-4 text-base text-slate-100">
                          Joining Date
                        </th>
                        <td className="px-4 py-2">
                          {new Date(profile.joiningDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>



          <button
            className="mt-4 px-4 py-2 bg-violet-700 text-white rounded hover:bg-violet-900"
            onClick={() => setShowChangePwd((v) => !v)}
          >
            {showChangePwd ? 'Cancel' : 'Change Password'}
          </button>

          {showChangePwd && (
            <form className="mt-4 flex flex-col gap-2" onSubmit={submitPwdChange}>
              <input
                type="password"
                name="previousPassword"
                placeholder="Previous Password"
                value={pwdForm.previousPassword}
                onChange={handlePwdChange}
                required
                className="rounded border p-2"
              />
              <input
                type="password"
                name="newPassword"
                placeholder="New Password"
                value={pwdForm.newPassword}
                onChange={handlePwdChange}
                required
                className="rounded border p-2"
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm New Password"
                value={pwdForm.confirmPassword}
                onChange={handlePwdChange}
                required
                className="rounded border p-2"
              />
              <button type="submit" className="bg-violet-700 text-white rounded px-4 py-2 hover:bg-violet-900">
                Submit
              </button>
              {pwdMsg && <div className="text-red-600 mt-2">{pwdMsg}</div>}
            </form>
          )}


        </>
      ) : (
        <Loading />
      )}
    </main>
  );
};

export default Profile;
