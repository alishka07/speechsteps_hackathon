import { Navigate } from 'react-router-dom';

/** Keep older links valid while all entrances use the same current game. */
export default function ChildModeWebScreen() {
  return <Navigate to="/play-world" replace />;
}
