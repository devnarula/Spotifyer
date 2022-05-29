from __future__ import print_function
from dotenv import load_dotenv
import os
from apiclient.discovery import build
from googleapiclient import discovery
load_dotenv('.env')
api_key = os.environ.get('API_KEY')
youtube = build('youtube', 'v3', developerKey = api_key)

nextPageToken = None
while True:
    songName_request = youtube.playlistItems().list(
        part = 'contentDetails',
        playlistId = 'PLxA687tYuMWjWmj2ezaw6PmOarb-ACPUz',
        maxResults = 50,
        pageToken = nextPageToken #first is none
    )
    songName_response = songName_request.execute()

    vid_ids = []
    for item in songName_response['items']:
        vid_ids.append(item['contentDetails']['videoId'])

    vid_request = youtube.videos().list(
        part = 'contentDetails',
        id = ','.join(vid_ids) # max is 50

    )
    vid_response = vid_request.execute()


    video_detail_request = youtube.videos().list(
        part="snippet,contentDetails,statistics",
        id = ','.join(vid_ids) #random video
    )
    video_detail_response = video_detail_request.execute()

    for i in video_detail_response['items']:
        print(i['snippet']['title'])
    
    nextPageToken = songName_response.get('nextPageToken') #ask what page we are on

    if not nextPageToken:
        break