export type WindowsVersion = "11" | "10";
export type ComputerLesson = {
  id: string;
  title: string;
  group: string;
  minutes: number;
  goal: string;
  steps: string[];
  steps10?: string[];
  exercise: string;
  hint: string;
  review: string[];
  practice?: "pointer" | "typing";
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
  reference: { title: string; url: string };
};

export const computerReviewed = "6 October 2026";
export const windows10Support =
  "https://support.microsoft.com/en-us/windows/deployment/updates-lifecycle/windows-10-support-has-ended-on-october-14-2025";
const ref = (title: string, path: string) => ({
  title: `Microsoft: ${title}`,
  url: `https://support.microsoft.com/en-us/${path}`,
});
const basics = ref("Windows help", "windows/");
const keys = ref(
  "Windows keyboard tips",
  "windows/hardware/input-devices/windows-keyboard-tips-and-tricks",
);
const files = ref(
  "File Explorer",
  "windows/experience/fileexplorer/file-explorer-in-windows",
);
const power = ref(
  "shut down, sleep or hibernate",
  "windows/experience/power-battery/shut-down-sleep-or-hibernate-your-pc",
);
const backup = ref(
  "backup and recovery",
  "windows/experience/backup-recovery/backup-restore-and-recovery-in-windows",
);

export function computerSteps(lesson: ComputerLesson, version: WindowsVersion) {
  return version === "10" && lesson.steps10 ? lesson.steps10 : lesson.steps;
}

export const computerLessons: ComputerLesson[] = [
  {
    id: "meet-your-computer",
    title: "Meet your PC or laptop",
    group: "Start here",
    minutes: 7,
    goal: "Recognise the main parts and understand what Windows does.",
    steps: [
      "A desktop PC usually has a separate screen, keyboard and mouse. A laptop combines these with a touchpad and battery. Both can run Windows; the device and the operating system are different things.",
      "Hardware means the physical parts you can touch. Software means programs, also called apps. Windows is the software that helps you open apps, organise files and change settings.",
      "Find your screen, power button, keyboard, pointer device and charger or power cable. Ports connect accessories. Check the device manual before connecting an unfamiliar plug; never force it.",
      "On a Windows device, open Start, type About your PC, and open the matching Settings result. Look under Windows specifications for the edition and version. Choose Windows 11 or Windows 10 above these lessons to match your device. Mac and Chromebook steps are different.",
    ],
    exercise:
      "Point to five parts of your computer. In your notes, write the Windows version you found and one app you would like to learn.",
    hint: "The screen shows information; the keyboard enters text; the mouse or touchpad moves the pointer.",
    review: [
      "I can distinguish the computer from Windows.",
      "I know where to find my Windows version.",
    ],
    quiz: {
      question: "What is Windows?",
      options: [
        "The physical screen",
        "Software that helps you use the computer",
        "A type of charging cable",
      ],
      correct: 1,
      explanation:
        "Windows is an operating system. It helps you work with apps, files and hardware.",
    },
    reference: basics,
  },
  {
    id: "power-sign-in",
    title: "Start, sign in and shut down",
    group: "Start here",
    minutes: 8,
    goal: "Start a session, protect it when you step away, and finish properly.",
    steps: [
      "Connect power if needed and press the power button once. Wait for Windows to load. Select your own account and sign in using its password, PIN or configured sign-in method. Keep sign-in details private.",
      "Press Windows key + L when leaving the desk. This locks the session without closing your apps. Sign back in using your usual method.",
      "Save your work before finishing. Open Start > Power > Shut down. Wait until the device has shut down before disconnecting its power. Restart closes Windows and starts it again; save before using it too.",
      "Sleep is useful for a short break, but it is not a backup or a promise that work is saved. Closing a laptop lid may sleep it, depending on its settings. Avoid holding the power button during ordinary use.",
    ],
    exercise:
      "Save any open work, lock your computer and sign back in. Find the Power menu and identify Sleep, Restart and Shut down without choosing them yet.",
    hint: "The Windows key has a Windows logo. Hold it while pressing L, then release both keys.",
    review: [
      "I can lock and unlock my session.",
      "I know to save before restarting or shutting down.",
    ],
    quiz: {
      question:
        "You are stepping away for two minutes. What protects your session?",
      options: [
        "Leave the screen open",
        "Unplug the computer",
        "Lock it with Windows key + L",
      ],
      correct: 2,
      explanation:
        "Locking requires sign-in to resume while keeping the session open.",
    },
    reference: power,
  },
  {
    id: "mouse-touchpad",
    title: "Use a mouse or touchpad",
    group: "Start here",
    minutes: 10,
    goal: "Point, click, scroll and open a menu with confidence.",
    steps: [
      "Move the mouse across a surface, or slide one finger on the touchpad, to move the pointer. Lift and reposition your finger if you reach the edge of the touchpad.",
      "Click once to select an item or activate a button. In File Explorer, double-click usually opens a file or folder, although this can be changed in settings. Web links normally need only one click.",
      "Right-click opens a menu of actions. Many touchpads support a two-finger tap for this. A mouse wheel or a two-finger slide on a supported touchpad scrolls a page.",
      "To drag, hold the primary mouse button while moving, then release. Practise on a harmless item first. Touchpad gestures vary by device; its settings or manual explain supported gestures.",
    ],
    exercise:
      "Use the practice pad below. Select the target, open it with a double-click, then open its practice menu. On a phone, use the labelled alternative buttons.",
    hint: "A double-click is two quick clicks in the same place. You can slow the double-click setting later if needed.",
    review: [
      "I can select and open an item.",
      "I can scroll and bring up an item’s menu.",
    ],
    practice: "pointer",
    quiz: {
      question: "What does a right-click usually show?",
      options: [
        "A menu of actions for the item",
        "The sign-in screen",
        "A saved copy of the file",
      ],
      correct: 0,
      explanation:
        "A context menu offers actions related to the item you clicked.",
    },
    reference: ref(
      "touchpad gestures",
      "windows/hardware/input-devices/touch-gestures-for-windows",
    ),
  },
  {
    id: "keyboard",
    title: "Type and edit with the keyboard",
    group: "Start here",
    minutes: 10,
    goal: "Enter text, correct a mistake and use simple shortcuts.",
    steps: [
      "Click in a text box first. The blinking line is the text cursor: new letters appear there. Space inserts a gap; Enter usually starts a new line in a document. In some forms it submits instead.",
      "Hold Shift while pressing a letter for a capital. Caps Lock stays on until pressed again. Backspace removes text before the cursor; Delete usually removes text after it. Arrow keys move the cursor.",
      "Select some practice text by dragging across it. Ctrl + C copies the selection; Ctrl + V pastes it where the cursor is. In many apps, Ctrl + Z undoes the last edit and Ctrl + A selects all text in the focused field.",
      "For a shortcut, hold the first key, press the second, then release both. Tab moves between many controls; Shift + Tab goes back. Enter activates a focused button. Practise without typing any real passwords.",
    ],
    exercise:
      "Type the sentence in the practice box. Correct mistakes with Backspace or the arrow keys. Try selecting and copying a word into your notes.",
    hint: "Check capital letters, spaces and the final full stop. This is practice, not a speed test.",
    review: [
      "I can correct a word without deleting the whole sentence.",
      "I can explain the difference between copying and pasting.",
    ],
    practice: "typing",
    quiz: {
      question: "Which shortcut pastes something you have copied?",
      options: ["Ctrl + C", "Ctrl + V", "Caps Lock"],
      correct: 1,
      explanation:
        "Ctrl + C copies a selection. Ctrl + V pastes it into the focused destination.",
    },
    reference: keys,
  },
  {
    id: "desktop-start",
    title: "Find your way around Windows",
    group: "Start here",
    minutes: 8,
    goal: "Use the desktop, taskbar, Start menu and Settings.",
    steps: [
      "The desktop is the background workspace. The taskbar contains Start and app buttons. Its icons may be centred or left-aligned, so look for the Windows logo rather than relying on its position.",
      "Select Start, type Calculator and select the Calculator app result. Search results can include apps, files and web suggestions; check the result type before opening it.",
      "An app can keep running when its window is hidden. Select its taskbar button to return. The clock and network, sound and battery area show useful status information.",
      "Press Windows key + I to open Settings. Use the Settings search box to find a setting. Change one thing at a time so you can recognise and undo its effect.",
    ],
    steps10: [
      "The desktop is your background workspace. Start is normally at the bottom left of the taskbar. The taskbar also contains app buttons and the clock area.",
      "Select Start and type Calculator, then open the app result. Start may show tiles and an app list. Check whether a search result is an app, file or web suggestion.",
      "Select an app’s taskbar button to return to its window. Hiding a window does not necessarily close the app.",
      "Press Windows key + I to open Settings. Use its search box and change one setting at a time. Some Settings categories have different names from Windows 11.",
    ],
    exercise:
      "Open Calculator using Start search, calculate 12 + 8, then open Settings. Write how you found each app.",
    hint: "After selecting Start, you can start typing the app’s name.",
    review: [
      "I can open an app from Start.",
      "I can find Settings and return to an open app.",
    ],
    quiz: {
      question: "You need to find an installed app. Where can you start?",
      options: ["Unplug the keyboard", "Delete a desktop icon", "Start search"],
      correct: 2,
      explanation: "Start search helps you find installed apps by name.",
    },
    reference: ref(
      "exploring Windows Settings",
      "windows/experience/exploring-windows-settings",
    ),
  },
  {
    id: "windows",
    title: "Work with more than one window",
    group: "Everyday files",
    minutes: 8,
    goal: "Switch between apps and recognise window controls.",
    steps: [
      "The minus button minimises a window to the taskbar. The square button maximises it or restores its smaller size. The X closes that window; save work if asked.",
      "Hold Alt and tap Tab to choose another open app, then release Alt. Try this with Calculator and a browser.",
      "Drag a window by its title bar to move it. Drag a border or corner to resize a window that supports resizing. A maximised window may need restoring first.",
      "On Windows, Windows key + Left arrow or Right arrow can snap a supported window to one side. Escape dismisses many menus. You can always select the other app’s taskbar button to return to it.",
    ],
    exercise:
      "Open two apps. Minimise one, bring it back, and switch using Alt + Tab. Put the two windows side by side if your screen has room.",
    hint: "Minimise hides the window; close ends that window. They are different actions.",
    review: [
      "I can return to a minimised app.",
      "I know which button closes a window.",
    ],
    quiz: {
      question: "What does minimising a window do?",
      options: [
        "Hides it from the desktop while it remains available on the taskbar",
        "Deletes the app",
        "Always saves the document",
      ],
      correct: 0,
      explanation:
        "Minimising changes the window’s visibility. It does not guarantee your document is saved.",
    },
    reference: keys,
  },
  {
    id: "files-folders",
    title: "Organise files and folders",
    group: "Everyday files",
    minutes: 10,
    goal: "Create a practice folder and recognise where a file lives.",
    steps: [
      "A file is one saved item, such as a photo or document. A folder groups items. A filename describes the item; an extension such as .txt, .pdf or .jpg helps identify its type.",
      "Press Windows key + E for File Explorer. Select Documents in its navigation or Home area. Notice the location bar at the top; it tells you which folder is open. Documents may be inside OneDrive if backup is enabled.",
      "In Documents, choose New > Folder and name it JEFF Practice. Open it. Keep this folder for the course so you do not experiment with important files.",
      "To rename a selected practice item, press F2 and type a clear name. Do not change a file extension to convert its format; renaming .txt to .pdf does not make a PDF.",
    ],
    steps10: [
      "A file is a saved document, picture or other item. A folder groups items. An extension such as .txt or .pdf helps identify the file type.",
      "Press Windows key + E for File Explorer and open Documents, often under Quick access or This PC. Read the location bar; Documents may be inside OneDrive.",
      "Use Home > New folder in the ribbon, or right-click an empty area and choose New > Folder. Name it JEFF Practice and open it.",
      "Press F2 to rename a selected practice item. Keep its file extension. Changing the extension does not convert the file.",
    ],
    exercise:
      "Create JEFF Practice in Documents. Inside it, create a folder called Pictures to keep and write down the parent folder’s location.",
    hint: "If New is not visible, right-click an empty area in the folder and look for New > Folder.",
    review: [
      "I can tell a file from a folder.",
      "I can find my practice folder again.",
    ],
    quiz: {
      question: "What is a folder used for?",
      options: [
        "Charging a laptop",
        "Grouping and organising files",
        "Making every file a PDF",
      ],
      correct: 1,
      explanation:
        "Folders organise items. They can contain files and other folders.",
    },
    reference: files,
  },
  {
    id: "save-document",
    title: "Create and save a simple document",
    group: "Everyday files",
    minutes: 12,
    goal: "Save a short note with a clear name, then reopen it.",
    steps: [
      "Open Notepad from Start search. Make a new note and type a short shopping list. A plain text note is ideal for learning; formatting options depend on the installed app version.",
      "Choose File > Save as, select Documents > JEFF Practice, and name it shopping-list.txt. If you skipped the previous lesson, create the practice folder first. Check the destination before selecting Save.",
      "Add one item, then choose File > Save or press Ctrl + S. Some apps remember unsaved tabs; that is not a substitute for deliberately saving a named file.",
      "Close the note, open File Explorer and find shopping-list.txt in JEFF Practice. Open it and check that the new item is there. Save as lets you choose a different name or destination for another copy.",
    ],
    exercise:
      "Create shopping-list.txt containing five items. Save it in JEFF Practice, reopen it from File Explorer and add a sixth item.",
    hint: "Remember three things when saving: the folder, the filename and the file type.",
    review: [
      "I can identify the saved file’s name and folder.",
      "I reopened the file and found my latest edit.",
    ],
    quiz: {
      question:
        "How can you check that your document was saved where you expected?",
      options: [
        "Assume the open tab proves it",
        "Rename its extension",
        "Find and reopen the named file from its folder",
      ],
      correct: 2,
      explanation:
        "Reopening the saved file checks both its destination and its contents.",
    },
    reference: files,
  },
  {
    id: "copy-move-delete",
    title: "Copy, move and recover a file",
    group: "Everyday files",
    minutes: 10,
    goal: "Understand the difference between a copy, a move and a deletion.",
    steps: [
      "Use only a disposable practice file. Select it and press Ctrl + C, open another practice folder, then press Ctrl + V. A copy leaves the original in its original folder.",
      "Ctrl + X followed by Ctrl + V moves a selected file. Check the destination before doing this. If asked to replace an existing file, cancel unless you understand which version would be replaced.",
      "Delete a disposable local practice copy with the ordinary Delete command. Many local deletions go to Recycle Bin. Open Recycle Bin, select that copy, right-click it and choose Restore.",
      "Do not rely on Recycle Bin for every device or location: USB drives, network locations, cloud services and permanent deletions can behave differently. Avoid Shift + Delete and do not empty Recycle Bin for this exercise.",
    ],
    exercise:
      "Copy your shopping list into Pictures to keep, confirm both copies exist, then delete and restore only the extra practice copy.",
    hint: "Copy keeps the original. Move changes the location. Restore returns a recycled item to its original location.",
    review: [
      "I checked both folders after copying.",
      "I only deleted a disposable copy and know where it was restored.",
    ],
    quiz: {
      question: "Which action leaves the original file in place?",
      options: ["Copy and paste", "Cut and paste", "Permanent delete"],
      correct: 0,
      explanation:
        "Copy and paste makes another copy; cut and paste moves the item.",
    },
    reference: keys,
  },
  {
    id: "web-browsing",
    title: "Use a browser and search the web",
    group: "Get connected",
    minutes: 10,
    goal: "Open a website, use tabs and recognise the address bar.",
    steps: [
      "A browser, such as Microsoft Edge, opens websites. A search engine helps find pages. Open Edge and locate the address bar near the top.",
      "Type support.microsoft.com into the address bar and press Enter. Typing a known web address goes to that site; typing a question usually sends a search to the chosen search engine.",
      "Use Ctrl + T for a new tab in Edge. Tabs keep several pages inside one browser window. Select a tab to return to it, or use its X to close it.",
      "Use the browser’s Back button to return to a previous page. Ctrl + F finds text on the current page. Read the full site address before signing in; a padlock or HTTPS connection alone does not prove a site is honest.",
    ],
    exercise:
      "Open Microsoft Support in one tab and search for Windows keyboard shortcuts in a second tab. Return to the first tab and find the word Windows on the page.",
    hint: "The address bar is part of the browser, above the website’s own content.",
    review: [
      "I can switch tabs without losing the first page.",
      "I can recognise the website’s address.",
    ],
    quiz: {
      question: "Where should you type a known website address?",
      options: [
        "The computer’s power menu",
        "The browser address bar",
        "The document filename box",
      ],
      correct: 1,
      explanation:
        "The address bar accepts website addresses as well as search terms.",
    },
    reference: ref(
      "Microsoft Edge shortcuts",
      "edge/keyboard-shortcuts-in-microsoft-edge",
    ),
  },
  {
    id: "downloads",
    title: "Download and find a file",
    group: "Get connected",
    minutes: 8,
    goal: "Understand where downloaded files go and how to open them again.",
    steps: [
      "Downloading saves a copy from a website to your device. Uploading sends a selected file from your device to a service. You do not need to install an app just to view every document.",
      "For this exercise, use this lesson’s Download lesson notes button. Your browser may ask where to save the text file or use its configured download folder.",
      "In Edge, open its menu > Downloads to see recent downloads. To find the default location, use Settings > Downloads. File Explorer’s Downloads folder is a common destination, but it can be changed.",
      "Find the lesson’s .txt file and open it. Only open downloads you expected from a source you trust. If a browser blocks a suspicious download, do not bypass the warning to complete this exercise.",
    ],
    exercise:
      "Write one sentence in your notes, download this lesson, then locate and open the downloaded file. Check that your sentence is included.",
    hint: "The downloaded filename starts with jeff-computer-downloads. Look at your browser’s download list if you cannot find it.",
    review: [
      "I can find my browser’s download location.",
      "I reopened the downloaded text file.",
    ],
    quiz: {
      question:
        "You cannot find a file you just downloaded. What should you check first?",
      options: [
        "The keyboard cable",
        "An unrelated app",
        "The browser’s Downloads list and save location",
      ],
      correct: 2,
      explanation:
        "The download list helps you find the file or see whether the download finished.",
    },
    reference: ref(
      "find your browser’s download folder",
      "microsoft-edge/find-where-your-browser-is-saving-downloads-d3e83af6-68bb-aa90-3167-eeb657013902",
    ),
  },
  {
    id: "wifi",
    title: "Connect to Wi-Fi",
    group: "Get connected",
    minutes: 8,
    goal: "Join a known wireless network and recognise connection problems.",
    steps: [
      "Choose a network you own or have permission to use. Get its exact name and password from the owner; do not write the password in your course notes.",
      "Select the network, sound or battery area on the taskbar to open quick settings. Next to Wi-Fi, open the available networks, choose the network and select Connect.",
      "Enter the network password carefully and follow the prompts. A connection to Wi-Fi does not always mean internet access is working; try opening a familiar website.",
      "If you cannot see the network, check Wi-Fi is on and Airplane mode is off, then move closer to the router. Some desktop PCs need a Wi-Fi adapter or an Ethernet cable. Ask the owner before restarting shared network equipment.",
    ],
    steps10: [
      "Get the exact network name and password from its owner. Keep the password out of your lesson notes.",
      "Select the Network icon on the taskbar, choose the Wi-Fi network, then Connect. Enter its password and follow the prompts.",
      "Try a familiar website after connecting. Being connected to the router does not guarantee the router has internet access.",
      "If the network is missing, check Wi-Fi is enabled and Airplane mode is off. Move closer to the router. Some desktops use an adapter or Ethernet instead; ask before restarting shared equipment.",
    ],
    exercise:
      "Find the name of your current network without disconnecting it. If you need to connect, follow the steps with a known network and open a familiar website.",
    hint: "Network names can look similar. Check the exact name with the owner before entering a password.",
    review: [
      "I can recognise the correct network.",
      "I can distinguish Wi-Fi connection from working internet.",
    ],
    quiz: {
      question:
        "Who should confirm the name and password of a private network?",
      options: [
        "Its owner or administrator",
        "An unexpected pop-up",
        "A stranger offering a download",
      ],
      correct: 0,
      explanation:
        "Use network details from the person responsible for that network.",
    },
    reference: ref(
      "connect to Wi-Fi",
      "windows/experience/connectivity-networking/connect-to-a-wi-fi-network-in-windows",
    ),
  },
  {
    id: "email-attachments",
    title: "Write an email and attach a file",
    group: "Get connected",
    minutes: 12,
    goal: "Prepare a clear email and choose the right attachment.",
    steps: [
      "Open your usual email app or its official website and sign in privately. Email layouts vary. Look for New message or Compose. Practise with a draft addressed to yourself.",
      "Fill in the recipient, a useful subject and a short message. To normally identifies the main recipient; Cc copies others visibly. Check every address before sending.",
      "Use the attachment button, often a paperclip, and browse to Documents > JEFF Practice. Choose your practice text file. Wait for it to attach, then check the displayed name. Some services offer a cloud link instead; check its access settings.",
      "Reread the draft, recipient and attachment. Leave it as a draft unless you intend to send it. Do not open unexpected attachments simply because the sender’s displayed name looks familiar.",
    ],
    exercise:
      "Prepare a draft to yourself with the subject My first practice file and attach shopping-list.txt. Review it and choose whether to send it to yourself.",
    hint: "The attachment chooser works like a small File Explorer window. Navigate to the folder where you saved the file.",
    review: [
      "I checked the recipient and subject.",
      "I verified the attachment’s name and contents.",
    ],
    quiz: {
      question: "Before sending an attachment, what should you check?",
      options: [
        "Only the colour of the Send button",
        "The recipient and the exact file or link being shared",
        "Nothing once the filename appears",
      ],
      correct: 1,
      explanation:
        "Check who will receive it and whether you selected the intended content.",
    },
    reference: ref(
      "recognise phishing",
      "security/protect-yourself-from-phishing",
    ),
  },
  {
    id: "sound-camera",
    title: "Set up sound, microphone and camera",
    group: "Make it comfortable",
    minutes: 10,
    goal: "Choose the right audio device and prepare for a call.",
    steps: [
      "For sound, open Settings > System > Sound. Check the output device and volume. A connected headset or monitor may have become the output instead of the built-in speakers.",
      "In the same Sound settings, choose the intended input microphone. Your calling app may also have its own device selection and mute button. Test at a comfortable volume.",
      "Camera and microphone permissions are under Settings > Privacy & security. Desktop apps and browser sites may need separate permissions. Allow access only for an app or website you intend to use.",
      "Before joining a call, check the app’s preview, microphone mute state and background. Look for a physical camera cover or headset mute switch if the device seems unavailable.",
    ],
    steps10: [
      "Open Settings > System > Sound and choose the output device and volume. Check whether sound is going to a headset or another connected device.",
      "Choose your microphone under Input. The calling app can have separate device and mute settings.",
      "Camera and microphone permissions are under Settings > Privacy. Browser sites can request their own permission too. Allow access only for a service you intend to use.",
      "Use your call app’s preview to check audio, camera and background. Check any physical camera cover or headset mute switch.",
    ],
    exercise:
      "Identify your speaker and microphone in Settings. If you use video calls, open its preview or test feature without calling another person.",
    hint: "If the volume is up but you hear nothing, check which output device is selected.",
    review: [
      "I know which device plays sound.",
      "I can check mute and camera privacy settings.",
    ],
    quiz: {
      question:
        "Sound is going to your monitor instead of your headphones. What should you check?",
      options: [
        "The document filename",
        "Recycle Bin",
        "The selected sound output device",
      ],
      correct: 2,
      explanation:
        "Choose the intended output in Windows and, if needed, the calling app.",
    },
    reference: ref(
      "Windows Settings",
      "windows/experience/exploring-windows-settings",
    ),
  },
  {
    id: "accessibility",
    title: "Make text and controls easier to use",
    group: "Make it comfortable",
    minutes: 8,
    goal: "Adjust Windows so you can see and use it comfortably.",
    steps: [
      "Open Settings > Accessibility > Text size. Move the slider, read the preview and choose Apply when the size suits you. This helps with text without requiring every app window to be enlarged.",
      "For the overall size of apps and controls, look at Settings > System > Display > Scale. Record the original setting before changing it, and use a recommended value where available.",
      "Windows key + Plus opens Magnifier. Windows key + Esc closes it. Try zooming in briefly and then returning to the normal view.",
      "Accessibility also offers pointer, keyboard and reading aids. Explore one option at a time. This course’s Read lesson button speaks the written steps when a suitable local browser voice is available.",
    ],
    steps10: [
      "Open Settings > Ease of Access > Display. Under Make text bigger, adjust the sample and choose Apply.",
      "For the size of apps and other items, look in Settings > System > Display for scaling. Note the original value first.",
      "Windows key + Plus opens Magnifier, and Windows key + Esc closes it. Try this briefly, then return to your normal view.",
      "Windows 10 calls many accessibility options Ease of Access. Explore one adjustment at a time and use Read lesson here if a local browser voice is available.",
    ],
    exercise:
      "Try a comfortable text size or briefly use Magnifier. Write down the original setting and your preferred setting.",
    hint: "Windows key + Esc closes Magnifier if the view feels too large.",
    review: [
      "I can read the screen comfortably.",
      "I know how to reverse the adjustment I tried.",
    ],
    quiz: {
      question: "Text in Windows menus is too small. Which setting is useful?",
      options: [
        "Text size in Accessibility or Ease of Access",
        "The Wi-Fi password",
        "The file extension",
      ],
      correct: 0,
      explanation:
        "Text size is designed to make interface text easier to read.",
    },
    reference: ref(
      "make text and apps bigger",
      "accessibility/windows/make-text-and-apps-bigger",
    ),
  },
  {
    id: "install-apps",
    title: "Find, install and remove apps",
    group: "Make it comfortable",
    minutes: 10,
    goal: "Recognise a trustworthy app source and manage installed apps.",
    steps: [
      "First search Start to see whether the app is already installed. To find a new app, open Microsoft Store from Start or use the publisher’s official website.",
      "Check the publisher, purpose, price and permissions. Avoid sponsored lookalikes, download adverts and unexpected installers. On a work or school computer, ask its administrator about permitted software.",
      "If installing an app you intend to use, follow its prompts carefully. A Windows permission prompt should match the app and publisher you chose. Cancel unexpected prompts; do not disable security protections to install something.",
      "To review installed apps, open Settings > Apps > Installed apps. Use an app’s menu for Uninstall when appropriate. Removing a shortcut does not uninstall an app; removing the app may also remove its local data.",
    ],
    steps10: [
      "Search Start before downloading an app. Use Microsoft Store or the publisher’s official website if you need a new one.",
      "Check publisher, price and permissions. Avoid download adverts or unfamiliar installers, and follow work or school device rules.",
      "Only accept an installation permission prompt that matches the app you deliberately chose. Cancel unexpected prompts and keep security protections on.",
      "Open Settings > Apps > Apps & features to review or uninstall apps. Deleting a shortcut is not uninstalling. Back up needed app data before removal.",
    ],
    exercise:
      "Find an app in Microsoft Store and read its publisher and price. Then find the installed apps list. You do not need to install or remove anything for this lesson.",
    hint: "Do not confuse a website’s advert for a download button from the actual publisher.",
    review: [
      "I can identify who publishes an app.",
      "I can find the installed apps list.",
    ],
    quiz: {
      question:
        "An unexpected pop-up tells you to install a cleaner. What is a sensible response?",
      options: [
        "Install it immediately",
        "Close it and use a trusted source if you actually need an app",
        "Turn off security software",
      ],
      correct: 1,
      explanation:
        "Choose software deliberately and check its publisher instead of trusting an unsolicited prompt.",
    },
    reference: ref(
      "install programs from online sources",
      "windows/apps/how-to-install-programs-from-online-sources-on-windows",
    ),
  },
  {
    id: "printing",
    title: "Connect accessories and print",
    group: "Make it comfortable",
    minutes: 10,
    goal: "Recognise connection types and check a print job before sending it.",
    steps: [
      "A USB accessory uses a compatible cable or port; Bluetooth connects wirelessly after pairing. Follow the manufacturer’s instructions and do not force connectors. Not every USB-shaped port supports every function.",
      "For a printer, check it is powered on and connected by its intended USB cable or to the same network as your PC. Open Settings > Bluetooth & devices > Printers & scanners, then Add device if needed.",
      "In your document app, use File > Print or Ctrl + P where supported. Select the intended printer, page range, paper size and number of copies. Look at the preview before printing.",
      "If Microsoft Print to PDF is available, it saves a PDF file rather than printing on paper. Choose a filename and location, then open the saved PDF to check it. Cancel the print dialog if you are only practising.",
    ],
    steps10: [
      "Check the accessory’s connector and manual. USB uses a cable or port; Bluetooth requires wireless pairing. Do not force a connector.",
      "For printers, open Settings > Devices > Printers & scanners, then Add a printer or scanner if needed. The printer should be on and connected by USB or to the same network.",
      "Use File > Print or Ctrl + P in your document app. Check printer, page range, copies and preview before sending the job.",
      "Microsoft Print to PDF, when available, saves a PDF instead of using paper. Choose a folder and filename and verify the saved result, or cancel the dialog if only practising.",
    ],
    exercise:
      "Open your shopping list’s print preview and identify the selected printer. Cancel without printing, or save a practice PDF if that option is available.",
    hint: "A printer name and Microsoft Print to PDF describe different destinations. Check which one you selected.",
    review: [
      "I checked the destination and number of copies.",
      "I know whether the action will produce paper or a file.",
    ],
    quiz: {
      question: "What should you check before selecting Print?",
      options: [
        "Only whether the mouse works",
        "Your wallpaper",
        "Printer, pages, copies and preview",
      ],
      correct: 2,
      explanation:
        "The print settings determine where the document goes and how much is printed.",
    },
    reference: ref(
      "add a printer",
      "windows/hardware/printer/add-or-install-a-printer-in-windows",
    ),
  },
  {
    id: "screenshots",
    title: "Take and save a screenshot",
    group: "Everyday confidence",
    minutes: 8,
    goal: "Capture a useful part of the screen without sharing private details.",
    steps: [
      "Arrange a harmless practice window on screen. Hide private messages, account details and passwords before capturing anything.",
      "Press Windows key + Shift + S to open the capture overlay. Choose a rectangular area and drag around the part you want. Press Escape if you want to cancel and try again.",
      "Open the resulting notification or Snipping Tool to review the image. Save it deliberately to JEFF Practice with a clear filename; automatic saving and notifications depend on the app’s version and settings.",
      "Open the saved image from its folder. Check that the useful information is legible and that no unrelated private information is visible before sharing it.",
    ],
    exercise:
      "Capture only the Calculator window, save the image and reopen it. Write down where you saved it.",
    hint: "You do not have to capture the entire screen. A small selection is often clearer.",
    review: [
      "The saved image shows the intended area.",
      "It contains no private information I did not intend to share.",
    ],
    quiz: {
      question: "What should you do before sharing a screenshot?",
      options: [
        "Review it for useful detail and private information",
        "Assume every screen is safe to share",
        "Rename it .txt",
      ],
      correct: 0,
      explanation:
        "Review the actual image, including background windows and account details.",
    },
    reference: ref(
      "use Snipping Tool",
      "windows/apps/use-snipping-tool-to-capture-screenshots",
    ),
  },
  {
    id: "battery",
    title: "Look after a laptop and its battery",
    group: "Everyday confidence",
    minutes: 7,
    goal: "Use power settings and handle a laptop with care.",
    steps: [
      "Use a compatible charger recommended for the device. Keep the laptop on a firm surface with ventilation clear. A bed or cushion can cover vents; avoid liquids near the computer.",
      "Select the battery area or open Settings > System > Power & battery. Review your charge level, screen and sleep settings, and Energy saver or Battery saver where available.",
      "Lower screen brightness to a comfortable level when running on battery. Save before long breaks or when the battery is low. Closing the lid follows its configured behaviour; do not assume it saved your work.",
      "If a battery is swollen, leaking or unusually hot, stop using the device and seek qualified service. Do not open, puncture or try to flatten it. Ordinary battery settings cannot fix physical damage.",
    ],
    steps10: [
      "Use a compatible charger and a firm surface that keeps vents clear. Keep drinks away from the laptop.",
      "Open Settings > System > Battery for battery options, or Power & sleep for screen and sleep timing. Availability depends on the device.",
      "Use comfortable brightness and save when power is low. Lid behaviour depends on settings and is not a replacement for saving.",
      "Stop using a swollen, leaking or unusually hot battery and seek qualified service. Do not attempt a physical repair yourself.",
    ],
    exercise:
      "Check the charge level and locate power settings. Write down one change that could help on battery, without changing an unfamiliar setting.",
    hint: "Desktop PCs may not have a battery section. The screen and sleep options are still useful.",
    review: [
      "I know where to check remaining battery power.",
      "I keep ventilation clear and use an appropriate charger.",
    ],
    quiz: {
      question: "Where should you use a laptop to keep its vents clear?",
      options: [
        "Under a blanket",
        "On a firm, suitable surface",
        "On a wet towel",
      ],
      correct: 1,
      explanation:
        "Keep ventilation unobstructed and the computer away from liquids.",
    },
    reference: ref(
      "battery saving tips",
      "windows/experience/power-battery/battery-saving-tips-for-windows",
    ),
  },
  {
    id: "updates-security",
    title: "Keep Windows updated and protected",
    group: "Everyday confidence",
    minutes: 10,
    goal: "Find genuine update and security settings and plan a restart.",
    steps: [
      "Open Settings > Windows Update and review the update status. Use Check for updates there instead of trusting a website that claims your Windows update is urgent.",
      "Save open work before a requested restart, keep a laptop connected to power and allow the update to finish. Schedule restarts when the options are available and you will not need the computer.",
      "Search Start for Windows Security and review its status. Keep protections enabled; do not install several competing antivirus products or disable protection to open an unfamiliar download.",
      "Use a unique account password and multi-factor authentication where offered. Never tell JEFF, a caller or a website pop-up your password, PIN or verification code.",
    ],
    steps10: [
      "Open Settings > Update & Security > Windows Update to review status. Standard Windows 10 support ended on 14 October 2025. Extended Security Updates and certain specialised editions have separate eligibility and support terms.",
      "A Check for updates button does not prove your Windows 10 edition still receives security fixes. Check Microsoft’s support information or ask the device administrator about ESU or a supported upgrade.",
      "Save work and connect power before an update restart. Open Windows Security from Start to review protection, and keep it enabled.",
      "Use a unique password and multi-factor authentication where available. Do not share passwords, PINs or verification codes, or disable security to open an unfamiliar file.",
    ],
    exercise:
      "Open Windows Update and record its status, without starting a restart while you are working. Find Windows Security and identify any action it asks you to review.",
    hint: "Open Settings yourself from Start. A web page claiming to be a Windows warning is not the Windows Update settings page.",
    review: [
      "I can find the real Windows Update settings.",
      "I know to save work and plan a restart.",
    ],
    quiz: {
      question: "Where should you check for Windows updates?",
      options: [
        "An unexpected advertisement",
        "A stranger’s email attachment",
        "The Windows Update section in Settings",
      ],
      correct: 2,
      explanation:
        "Use the built-in Windows Update settings to check your device’s update status.",
    },
    reference: ref(
      "install Windows updates",
      "windows/deployment/updates-lifecycle/install-windows-updates",
    ),
  },
  {
    id: "scams",
    title: "Spot suspicious messages and pop-ups",
    group: "Everyday confidence",
    minutes: 10,
    goal: "Pause, check the source and get trusted help.",
    steps: [
      "Be cautious about unexpected urgency: a prize, unpaid bill, account threat or claim that your PC is infected. A familiar display name or logo can be copied.",
      "Do not call a number from a frightening browser pop-up or give remote control to an unexpected caller. Genuine Microsoft error messages do not include a phone number asking you to call support.",
      "Close the suspicious tab or window. On Windows, Alt + F4 closes the active window. Avoid the pop-up’s own fake close or download buttons. If unsure, ask a trusted person to help.",
      "Verify a message using an address or phone number you already trust, not its embedded links. If you already shared a password or paid someone, promptly contact the real account provider or bank through its official channel.",
    ],
    exercise:
      "Imagine a page says Call this number in five minutes or lose your files. Write two warning signs and the trusted action you would take next. Do not visit a suspicious site to practise.",
    hint: "Pressure to act quickly is a reason to pause and verify independently.",
    review: [
      "I do not share sign-in codes or allow unsolicited remote access.",
      "I know how to verify a message through a separate trusted channel.",
    ],
    quiz: {
      question:
        "A browser pop-up demands an urgent call to a support number. What should you do?",
      options: [
        "Close it and seek help through a known official channel",
        "Call immediately and give remote access",
        "Enter your banking password",
      ],
      correct: 0,
      explanation:
        "Do not use the contact details in the suspicious warning. Verify independently.",
    },
    reference: ref(
      "protect yourself from online scams",
      "security/protect-yourself-from-online-scams-and-attacks",
    ),
  },
  {
    id: "backups",
    title: "Keep a backup of important files",
    group: "Everyday confidence",
    minutes: 12,
    goal: "Make a second copy and check that it can be opened.",
    steps: [
      "A backup is a recoverable copy kept separately from the working file. Another folder on the same disk does not protect you if that disk fails.",
      "For a small practice backup, copy a harmless file to an external drive you own. Reopen the copied file from that drive and check its contents. Safely eject removable storage using Windows before unplugging it.",
      "Windows Backup can save selected folders and settings through a personal Microsoft account and OneDrive. Open Windows Backup from Start to review exactly what is included and whether it finished. Storage limits and account requirements apply.",
      "Cloud synchronisation can also synchronise mistakes or deletions. Understand version history and recovery, and keep an independent copy of irreplaceable files. Do not assume every folder or installed app’s data is backed up automatically.",
    ],
    exercise:
      "Choose one practice file, identify a separate backup destination, and verify a copy if you have suitable storage. Otherwise write a backup plan with the file, destination and checking step.",
    hint: "Ask yourself: if this laptop disappeared, where would I retrieve the file?",
    review: [
      "I know exactly which files my backup includes.",
      "I have checked a copied file or recorded how I will verify it.",
    ],
    quiz: {
      question: "Which check gives you useful evidence that a backup worked?",
      options: [
        "Only seeing a cloud logo",
        "Opening the copied file from the backup destination",
        "Moving the original to Recycle Bin",
      ],
      correct: 1,
      explanation:
        "Verify the copy’s contents and location; a logo alone does not show that this file was backed up.",
    },
    reference: backup,
  },
  {
    id: "troubleshooting",
    title: "Solve small problems step by step",
    group: "Put it together",
    minutes: 10,
    goal: "Describe a problem and try simple checks before asking for help.",
    steps: [
      "Pause and describe what happened: which app, what you tried, what you expected and the exact message. Check whether one app or the whole computer is affected.",
      "Try one relevant check: confirm power and cables, the selected sound device, Wi-Fi status or the file’s location. Wait briefly if an app is busy. Avoid repeated clicking, which can queue the same action many times.",
      "Save work in responsive apps. If appropriate, close and reopen the affected app, or use Start > Power > Restart after saving. Forcing an app to close can lose unsaved work; do not do it as a routine first step.",
      "If the problem continues, use the app’s official help, Windows Get Help if available, or a trusted technician. Share the Windows version and error text without passwords. Do not reset Windows, delete system files or install a random repair tool for this lesson.",
    ],
    exercise:
      "Write a help request for this scenario: your headphones are connected but you hear no sound. Include the symptom, Windows version and two checks you would try.",
    hint: "A useful request is specific: I expected sound in this app, but heard nothing. I checked volume and the output device.",
    review: [
      "I can describe expected and actual behaviour.",
      "I know when to stop and ask for trusted help.",
    ],
    quiz: {
      question: "What is a helpful first response to a small computer problem?",
      options: [
        "Immediately reset Windows",
        "Delete unfamiliar system files",
        "Describe it and try one relevant, simple check",
      ],
      correct: 2,
      explanation:
        "Specific observations and one change at a time help you understand what fixes the problem.",
    },
    reference: basics,
  },
  {
    id: "everyday-project",
    title: "Your first everyday computer task",
    group: "Put it together",
    minutes: 20,
    goal: "Combine your new skills into a useful, repeatable routine.",
    steps: [
      "Create a folder named Weekend Plan inside JEFF Practice. Open Notepad and write three things you would like to do this weekend.",
      "Save the note as weekend-plan.txt inside that folder. Reopen it from File Explorer, add a time to each activity and save again.",
      "Use your browser to look up one relevant detail from a trustworthy source. Record the page address in the note. Take a screenshot of a harmless part of your plan and save it alongside the note.",
      "Prepare an email draft to yourself with the plan attached. Check the attachment, make a separate backup if you have a destination, then lock the computer when finished. Sending the email is optional.",
    ],
    exercise:
      "Complete your Weekend Plan and use the checklist below. Note any step you want to repeat with JEFF’s help.",
    hint: "Work slowly: create, save, reopen, check, back up. Return to the relevant lesson whenever you need a reminder.",
    review: [
      "My note and screenshot have clear names in the correct folder.",
      "I reopened and checked my saved note.",
      "I checked the email draft and attachment.",
      "I know how I will back up the files and lock my session.",
    ],
    quiz: {
      question: "What makes a good final check for an everyday document?",
      options: [
        "Reopen the saved file and check its contents and location",
        "Assume it is saved because it was typed",
        "Delete the practice folder immediately",
      ],
      correct: 0,
      explanation:
        "Checking the saved result builds confidence that you can find and use it again.",
    },
    reference: backup,
  },
];
