- [-] change the project from javascript to typescript ---- no need
- [-] remove/replace supabase to backend
- [-] add forget password and show password feature
- [-] add dark mode by making the color pallete constants
- [-] add the filter calender range insted of value
- [-] correct the dark mode button it is slightly off
- [-] remove shadcn button
- [-] add notification use
- [-] add on hover name of icon
- [-] reduce the size of header and search in home page
- [-] merge signin and signup
- [-] add a global state for dark/light mode
- [-] add owned boards and shared boards later -- https://dribbble.com/shots/26294998-Collaborative-Whiteboard-Dashboard-Clean-Minimal-UI
- [-] replace dashboard with home
- [-] add data
- [-] make the whiteboard infinite and with changing background patterns
- [-] minimap for navigation
- [-] adder user model in mongodb and login
  mobbin for design
- [-] add toast for every api response in frontend
- [-] Add the use of get started button , start drawing button , if not login then show landing page not login
  https://www.goodnotes.com/

https://github.com/TomHumphries/InfiniteCanvasWhiteboard/blob/master/index.html
use this as ref -- https://dev.to/keyurparalkar/mastering-real-time-collaboration-building-figma-and-miro-inspired-features-with-supabase-57eh
pan-and-zoon ref -- https://harrisonmilbradt.com/blog/canvas-panning-and-zooming
https://www.instagram.com/reel/DVgsX7SAc8K/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==

crdts
webrtc

zg8M9QiML1HsLqc3

- [-] Make the website Responsive
- [-] Make the whiteboard to be used using TOuch
- [-] Search Bar Functionality
- [-] Whiteboard Thumbnail to imagekit insted of database
- [-] add notification attribute to the users database model
- [-] Whiteboard card make design good like add owner and shared peoples , make the thumbnail size less
- [-] Add Profile Pics to Users
- [-] Google and Github Integration for Login
- [-] Add Button Feature/Name on Hovering it
- [-] Notification System including Toast Popups
- [-] Correct the toast usage and name on hover icons
- [-] My app is redering 2 times on start / Welcome back popup 2 times
- [-] Edit the ErrorBoundary Page
- [-] UI/UX Enhancement -- back prop , mmobbin, repovive
- [-] min size of grids
- [-] use username insted of user in sharepanel
- [-] use usedebounce in debounce save in usewhiteboard page
- [-] Forgot and Show Password
- [ ] Add a global state for dark/light mode
- [-] Add Shimmer UI
- [-] Add Home Button in Whiteboard
- [-] Add thumbnail , profile photo to cloud
- [-] Add a settings app for profile picture , name edit , etc
- [-] Main Whiteboard Features :- - Pan and Zoom , Infinite Canvas
- [-] Featureful Toolbar - Clear button not working
- [-] undo redo
- [-] erase fulll line at once - MiniMap for Navigation
- [ ] WhiteBoard Background Pattern and Color Selector
- [-] Shapes button
- [-] make the pen selector and eraser selector to the right slider and the shapes too
  uer add whiteboard in db , avatar pic , notification

Right now, you redraw everything on every frame. For giant boards, we usually split it into:
A Background Canvas: For finished strokes (only redraws when something changes).
A Drawing Canvas: For the current line being drawn (updates every mouse move).

- [-] make account settings good
- [-] show eraser and pen boundary
- [-] export board
- [-] add textbox image import
- [-] selection tool and make shape dimention changable and del to delete the shape
- [ ] live chat
- [-] good backend service platform ditch render
