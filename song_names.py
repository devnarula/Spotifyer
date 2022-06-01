from __future__ import print_function
from dotenv import load_dotenv
import os
from apiclient.discovery import build
from googleapiclient import discovery
from fastapi import FastAPI
load_dotenv('.env')
api_key = os.environ.get('API_KEY')
youtube = build('youtube', 'v3', developerKey = api_key)

def converter(url):
    playlist_Id = url.split("&")
    #print(playlist_Id)
    for i in range(len(playlist_Id)):
        if 'list=' in playlist_Id[i]:
            true_id = playlist_Id[i][5:]
            #print(true_id)
            return true_id
    return 'not a valid playlist'

def names(url):
    nextPageToken = None
    results = []
    count = 0
    while (nextPageToken != None or count == 0):
        songName_request = youtube.playlistItems().list(
            part = 'contentDetails',
            playlistId = converter(url),
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
            results.append(i['snippet']['title'])
            #print(i['snippet']['title'])
        
        nextPageToken = songName_response.get('nextPageToken') #ask what page we are on

        if not nextPageToken:
            break
        count += 1
    return results

app = FastAPI()
@app.post('/playlistsearch/')
def summarize(url: str):
    return {'lst': names(url)}
