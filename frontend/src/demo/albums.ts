import type { PosterSpec } from '../lib/api'

// Sample catalog metadata and cover artwork sourced from Apple Music/iTunes.
export const demoAlbums: (PosterSpec & { source: string })[] = [
  {
    "title": "After Hours",
    "artist": "The Weeknd",
    "year": "2020",
    "image_url": "/demo/cover-0.jpg",
    "source": "https://music.apple.com/us/album/after-hours/1499385848?uo=4",
    "palette": [
      "#08090c",
      "#46371c",
      "#8f977d",
      "#14100e",
      "#361810"
    ],
    "album_id": "demo-0",
    "col1": [
      {
        "track_number": 1,
        "num_display": "01",
        "name": "Alone Again",
        "duration_ms": 250057
      },
      {
        "track_number": 2,
        "num_display": "02",
        "name": "Too Late",
        "duration_ms": 239980
      },
      {
        "track_number": 3,
        "num_display": "03",
        "name": "Hardest To Love",
        "duration_ms": 211402
      },
      {
        "track_number": 4,
        "num_display": "04",
        "name": "Scared To Live",
        "duration_ms": 191299
      },
      {
        "track_number": 5,
        "num_display": "05",
        "name": "Snowchild",
        "duration_ms": 247192
      },
      {
        "track_number": 6,
        "num_display": "06",
        "name": "Escape From LA",
        "duration_ms": 355960
      },
      {
        "track_number": 7,
        "num_display": "07",
        "name": "Heartless",
        "duration_ms": 198267
      }
    ],
    "col2": [
      {
        "track_number": 8,
        "num_display": "08",
        "name": "Faith",
        "duration_ms": 283217
      },
      {
        "track_number": 9,
        "num_display": "09",
        "name": "Blinding Lights",
        "duration_ms": 200046
      },
      {
        "track_number": 10,
        "num_display": "10",
        "name": "In Your Eyes",
        "duration_ms": 237522
      },
      {
        "track_number": 11,
        "num_display": "11",
        "name": "Save Your Tears",
        "duration_ms": 215627
      },
      {
        "track_number": 12,
        "num_display": "12",
        "name": "Repeat After Me (Interlude)",
        "duration_ms": 195816
      },
      {
        "track_number": 13,
        "num_display": "13",
        "name": "After Hours",
        "duration_ms": 361025
      },
      {
        "track_number": 14,
        "num_display": "14",
        "name": "Until I Bleed Out",
        "duration_ms": 190151
      }
    ],
    "spine_lines": [
      {
        "type": "letter",
        "value": "A"
      },
      {
        "type": "letter",
        "value": "F"
      },
      {
        "type": "letter",
        "value": "T"
      },
      {
        "type": "letter",
        "value": "E"
      },
      {
        "type": "letter",
        "value": "R"
      },
      {
        "type": "sep",
        "value": "\u25c6"
      },
      {
        "type": "letter",
        "value": "H"
      },
      {
        "type": "letter",
        "value": "O"
      },
      {
        "type": "letter",
        "value": "U"
      },
      {
        "type": "letter",
        "value": "R"
      },
      {
        "type": "letter",
        "value": "S"
      }
    ]
  },
  {
    "title": "Discovery",
    "artist": "Daft Punk",
    "year": "2001",
    "image_url": "/demo/cover-1.jpg",
    "source": "https://music.apple.com/us/album/discovery/697194953?uo=4",
    "palette": [
      "#0a0d0a",
      "#000002",
      "#020302",
      "#5f6265",
      "#000202"
    ],
    "album_id": "demo-1",
    "col1": [
      {
        "track_number": 1,
        "num_display": "01",
        "name": "One More Time",
        "duration_ms": 320357
      },
      {
        "track_number": 2,
        "num_display": "02",
        "name": "Aerodynamic",
        "duration_ms": 212547
      },
      {
        "track_number": 3,
        "num_display": "03",
        "name": "Digital Love",
        "duration_ms": 301373
      },
      {
        "track_number": 4,
        "num_display": "04",
        "name": "Harder Better Faster Stronger",
        "duration_ms": 224693
      },
      {
        "track_number": 5,
        "num_display": "05",
        "name": "Crescendolls",
        "duration_ms": 211640
      },
      {
        "track_number": 6,
        "num_display": "06",
        "name": "Nightvision",
        "duration_ms": 104467
      },
      {
        "track_number": 7,
        "num_display": "07",
        "name": "Superheroes",
        "duration_ms": 237800
      }
    ],
    "col2": [
      {
        "track_number": 8,
        "num_display": "08",
        "name": "High Life",
        "duration_ms": 201800
      },
      {
        "track_number": 9,
        "num_display": "09",
        "name": "Something About Us",
        "duration_ms": 232667
      },
      {
        "track_number": 10,
        "num_display": "10",
        "name": "Voyager",
        "duration_ms": 227867
      },
      {
        "track_number": 11,
        "num_display": "11",
        "name": "Veridis Quo",
        "duration_ms": 345187
      },
      {
        "track_number": 12,
        "num_display": "12",
        "name": "Short Circuit",
        "duration_ms": 206867
      },
      {
        "track_number": 13,
        "num_display": "13",
        "name": "Face to Face",
        "duration_ms": 240173
      },
      {
        "track_number": 14,
        "num_display": "14",
        "name": "Too Long",
        "duration_ms": 600293
      }
    ],
    "spine_lines": [
      {
        "type": "letter",
        "value": "D"
      },
      {
        "type": "letter",
        "value": "I"
      },
      {
        "type": "letter",
        "value": "S"
      },
      {
        "type": "letter",
        "value": "C"
      },
      {
        "type": "letter",
        "value": "O"
      },
      {
        "type": "letter",
        "value": "V"
      },
      {
        "type": "letter",
        "value": "E"
      },
      {
        "type": "letter",
        "value": "R"
      },
      {
        "type": "letter",
        "value": "Y"
      }
    ]
  },
  {
    "title": "Currents",
    "artist": "Tame Impala",
    "year": "2017",
    "image_url": "/demo/cover-2.jpg",
    "source": "https://music.apple.com/us/album/currents-b-sides-remixes-ep/1440875696?uo=4",
    "palette": [
      "#494153",
      "#5b5265",
      "#21222a",
      "#6a5f73",
      "#938289"
    ],
    "album_id": "demo-2",
    "col1": [
      {
        "track_number": 1,
        "num_display": "01",
        "name": "List of People (To Try and Forget About)",
        "duration_ms": 280133
      },
      {
        "track_number": 2,
        "num_display": "02",
        "name": "Powerlines",
        "duration_ms": 258640
      },
      {
        "track_number": 3,
        "num_display": "03",
        "name": "Taxi\u2019s Here",
        "duration_ms": 287560
      }
    ],
    "col2": [
      {
        "track_number": 4,
        "num_display": "04",
        "name": "Reality in Motion (Gum Remix)",
        "duration_ms": 304200
      },
      {
        "track_number": 5,
        "num_display": "05",
        "name": "Let it Happen (Soulwax Remix)",
        "duration_ms": 557680
      }
    ],
    "spine_lines": [
      {
        "type": "letter",
        "value": "C"
      },
      {
        "type": "letter",
        "value": "U"
      },
      {
        "type": "letter",
        "value": "R"
      },
      {
        "type": "letter",
        "value": "R"
      },
      {
        "type": "letter",
        "value": "E"
      },
      {
        "type": "letter",
        "value": "N"
      },
      {
        "type": "letter",
        "value": "T"
      },
      {
        "type": "letter",
        "value": "S"
      }
    ]
  },
  {
    "title": "25",
    "artist": "Adele",
    "year": "2015",
    "image_url": "/demo/cover-3.jpg",
    "source": "https://music.apple.com/us/album/25/1544494115?uo=4",
    "palette": [
      "#22201a",
      "#d8d2c3",
      "#a49b8a",
      "#655d51",
      "#393429"
    ],
    "album_id": "demo-3",
    "col1": [
      {
        "track_number": 1,
        "num_display": "01",
        "name": "Hello",
        "duration_ms": 295502
      },
      {
        "track_number": 2,
        "num_display": "02",
        "name": "Send My Love (To Your New Lover)",
        "duration_ms": 223079
      },
      {
        "track_number": 3,
        "num_display": "03",
        "name": "I Miss You",
        "duration_ms": 348625
      },
      {
        "track_number": 4,
        "num_display": "04",
        "name": "When We Were Young",
        "duration_ms": 290900
      },
      {
        "track_number": 5,
        "num_display": "05",
        "name": "Remedy",
        "duration_ms": 245427
      },
      {
        "track_number": 6,
        "num_display": "06",
        "name": "Water Under the Bridge",
        "duration_ms": 240439
      }
    ],
    "col2": [
      {
        "track_number": 7,
        "num_display": "07",
        "name": "River Lea",
        "duration_ms": 225427
      },
      {
        "track_number": 8,
        "num_display": "08",
        "name": "Love in the Dark",
        "duration_ms": 285935
      },
      {
        "track_number": 9,
        "num_display": "09",
        "name": "Million Years Ago",
        "duration_ms": 227066
      },
      {
        "track_number": 10,
        "num_display": "10",
        "name": "All I Ask",
        "duration_ms": 271800
      },
      {
        "track_number": 11,
        "num_display": "11",
        "name": "Sweetest Devotion",
        "duration_ms": 251702
      }
    ],
    "spine_lines": [
      {
        "type": "letter",
        "value": "2"
      },
      {
        "type": "letter",
        "value": "5"
      }
    ]
  },
  {
    "title": "AM",
    "artist": "Arctic Monkeys",
    "year": "2013",
    "image_url": "/demo/cover-4.jpg",
    "source": "https://music.apple.com/us/album/am/663097964?uo=4",
    "palette": [
      "#0a1214",
      "#999c9d",
      "#040b0d",
      "#0b1214",
      "#091214"
    ],
    "album_id": "demo-4",
    "col1": [
      {
        "track_number": 1,
        "num_display": "01",
        "name": "Do I Wanna Know?",
        "duration_ms": 272394
      },
      {
        "track_number": 2,
        "num_display": "02",
        "name": "R U Mine?",
        "duration_ms": 201726
      },
      {
        "track_number": 3,
        "num_display": "03",
        "name": "One for the Road",
        "duration_ms": 206052
      },
      {
        "track_number": 4,
        "num_display": "04",
        "name": "Arabella",
        "duration_ms": 207357
      },
      {
        "track_number": 5,
        "num_display": "05",
        "name": "I Want It All",
        "duration_ms": 184350
      },
      {
        "track_number": 6,
        "num_display": "06",
        "name": "No. 1 Party Anthem",
        "duration_ms": 243060
      }
    ],
    "col2": [
      {
        "track_number": 7,
        "num_display": "07",
        "name": "Mad Sounds",
        "duration_ms": 215064
      },
      {
        "track_number": 8,
        "num_display": "08",
        "name": "Fireside",
        "duration_ms": 181034
      },
      {
        "track_number": 9,
        "num_display": "09",
        "name": "Why'd You Only Call Me When You're High?",
        "duration_ms": 161125
      },
      {
        "track_number": 10,
        "num_display": "10",
        "name": "Snap Out of It",
        "duration_ms": 192889
      },
      {
        "track_number": 11,
        "num_display": "11",
        "name": "Knee Socks",
        "duration_ms": 257563
      },
      {
        "track_number": 12,
        "num_display": "12",
        "name": "I Wanna Be Yours",
        "duration_ms": 184019
      }
    ],
    "spine_lines": [
      {
        "type": "letter",
        "value": "A"
      },
      {
        "type": "letter",
        "value": "M"
      }
    ]
  },
  {
    "title": "SOS",
    "artist": "SZA",
    "year": "2022",
    "image_url": "/demo/cover-5.jpg",
    "source": "https://music.apple.com/us/album/sos/1658650093?uo=4",
    "palette": [
      "#092947",
      "#021027",
      "#1c4567",
      "#345d7e",
      "#5a7b97"
    ],
    "album_id": "demo-5",
    "col1": [
      {
        "track_number": 1,
        "num_display": "01",
        "name": "SOS",
        "duration_ms": 117773
      },
      {
        "track_number": 2,
        "num_display": "02",
        "name": "Kill Bill",
        "duration_ms": 153947
      },
      {
        "track_number": 3,
        "num_display": "03",
        "name": "Seek & Destroy",
        "duration_ms": 203733
      },
      {
        "track_number": 4,
        "num_display": "04",
        "name": "Low",
        "duration_ms": 181080
      },
      {
        "track_number": 5,
        "num_display": "05",
        "name": "Love Language",
        "duration_ms": 183893
      },
      {
        "track_number": 6,
        "num_display": "06",
        "name": "Blind",
        "duration_ms": 150720
      },
      {
        "track_number": 7,
        "num_display": "07",
        "name": "Used (feat. Don Toliver)",
        "duration_ms": 146947
      },
      {
        "track_number": 8,
        "num_display": "08",
        "name": "Snooze",
        "duration_ms": 201800
      },
      {
        "track_number": 9,
        "num_display": "09",
        "name": "Notice Me",
        "duration_ms": 160920
      },
      {
        "track_number": 10,
        "num_display": "10",
        "name": "Gone Girl",
        "duration_ms": 244027
      },
      {
        "track_number": 11,
        "num_display": "11",
        "name": "Smoking on my Ex Pack",
        "duration_ms": 83827
      },
      {
        "track_number": 12,
        "num_display": "12",
        "name": "Ghost in the Machine (feat. Phoebe Bridgers)",
        "duration_ms": 218587
      }
    ],
    "col2": [
      {
        "track_number": 13,
        "num_display": "13",
        "name": "F2F",
        "duration_ms": 185040
      },
      {
        "track_number": 14,
        "num_display": "14",
        "name": "Nobody Gets Me",
        "duration_ms": 180853
      },
      {
        "track_number": 15,
        "num_display": "15",
        "name": "Conceited",
        "duration_ms": 151413
      },
      {
        "track_number": 16,
        "num_display": "16",
        "name": "Special",
        "duration_ms": 158840
      },
      {
        "track_number": 17,
        "num_display": "17",
        "name": "Too Late",
        "duration_ms": 164427
      },
      {
        "track_number": 18,
        "num_display": "18",
        "name": "Far",
        "duration_ms": 180680
      },
      {
        "track_number": 19,
        "num_display": "19",
        "name": "Shirt",
        "duration_ms": 181840
      },
      {
        "track_number": 20,
        "num_display": "20",
        "name": "Open Arms (feat. Travis Scott)",
        "duration_ms": 239613
      },
      {
        "track_number": 21,
        "num_display": "21",
        "name": "I Hate U",
        "duration_ms": 173907
      },
      {
        "track_number": 22,
        "num_display": "22",
        "name": "Good Days",
        "duration_ms": 278480
      },
      {
        "track_number": 23,
        "num_display": "23",
        "name": "Forgiveless (feat. Ol' Dirty Bastard)",
        "duration_ms": 141960
      }
    ],
    "spine_lines": [
      {
        "type": "letter",
        "value": "S"
      },
      {
        "type": "letter",
        "value": "O"
      },
      {
        "type": "letter",
        "value": "S"
      }
    ]
  }
]
