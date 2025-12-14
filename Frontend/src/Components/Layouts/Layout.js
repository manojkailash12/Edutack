import { Outlet, Navigate, useLocation } from "react-router-dom";
import Header from "./Header";
import Nav from "./Nav";
import Loading from "./Loading";
import { useContext, useState, useEffect } from "react";
import UserContext from "../../Hooks/UserContext";

// layout of the entire dash/ route
const Layout = () => {
  const { user } = useContext(UserContext);
  const location = useLocation().pathname;
  const [isLoading, setIsLoading] = useState(true);

  // Give a brief moment for localStorage to load user data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100); // Very brief delay to allow localStorage to load

    return () => clearTimeout(timer);
  }, []);

  // Show loading while checking for user data
  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="relative flex flex-col bg-slate-950">
      <Header />
      <main className="mt-[3.15rem] flex h-[calc(100vh-3.15rem)] whitespace-nowrap bg-slate-950">
        {location === "/dash" ? "" : <Nav />}
        {user?._id ? (
          <div className="outlet-border z-[1] mt-1 w-full overflow-y-auto bg-violet-50 p-4 text-slate-900 dark:bg-slate-900/90 dark:text-slate-400 lg:p-10">
            <Outlet />
          </div>
        ) : (
          <Navigate to="/" replace={true} />
        )}
      </main>
    </div>
  );
};

export default Layout;
