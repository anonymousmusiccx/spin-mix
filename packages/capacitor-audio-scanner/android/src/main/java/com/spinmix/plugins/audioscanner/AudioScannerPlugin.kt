package com.spinmix.plugins.audioscanner

import android.Manifest
import android.content.ContentUris
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.ByteArrayOutputStream
import java.io.InputStream

@CapacitorPlugin(
    name = "AudioScanner",
    permissions = [
        Permission(
            alias = "audio",
            strings = [
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ]
        )
    ]
)
class AudioScannerPlugin : Plugin() {

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val state = getPermissionState("audio")
        val ret = JSObject()
        ret.put("audio", state.toString().lowercase())
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (getPermissionState("audio") == PermissionState.GRANTED) {
            val ret = JSObject()
            ret.put("audio", "granted")
            call.resolve(ret)
            return
        }
        requestPermissionForAlias("audio", call, "audioPermissionCallback")
    }

    @PermissionCallback
    private fun audioPermissionCallback(call: PluginCall) {
        val state = getPermissionState("audio")
        val ret = JSObject()
        ret.put("audio", state.toString().lowercase())
        call.resolve(ret)
    }

    @PluginMethod
    fun listAudioFiles(call: PluginCall) {
        val audioList = JSArray()
        val appContext = context ?: run {
            call.reject("Application context is null")
            return
        }

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.SIZE
        )

        // Query only audio files tagged as music or non-empty duration
        val selection = "(${MediaStore.Audio.Media.IS_MUSIC} != 0 OR ${MediaStore.Audio.Media.DURATION} > 0)"
        val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

        try {
            val cursor = appContext.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                null,
                sortOrder
            )

            cursor?.use { c ->
                val idCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val artistCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                val durationCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val mimeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)
                val sizeCol = c.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)

                while (c.moveToNext()) {
                    val id = c.getLong(idCol)
                    val rawTitle = c.getString(titleCol)
                    val rawArtist = c.getString(artistCol)
                    val durationMs = c.getLong(durationCol)
                    val mimeType = c.getString(mimeCol) ?: "audio/mpeg"
                    val size = c.getLong(sizeCol)

                    val title = if (rawTitle.isNullOrBlank()) "Track $id" else rawTitle
                    val artist = if (rawArtist.isNullOrBlank() || rawArtist == "<unknown>") "Unknown Artist" else rawArtist
                    val durationSec = if (durationMs > 0) durationMs / 1000.0 else 0.0

                    val contentUri: Uri = ContentUris.withAppendedId(
                        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                        id
                    )

                    val item = JSObject()
                    item.put("id", id.toString())
                    item.put("title", title)
                    item.put("artist", artist)
                    item.put("duration", durationSec)
                    item.put("uri", contentUri.toString())
                    item.put("mimeType", mimeType)
                    item.put("size", size)

                    audioList.put(item)
                }
            }

            val result = JSObject()
            result.put("files", audioList)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Failed to query MediaStore audio files: ${e.message}", e)
        }
    }

    @PluginMethod
    fun readAudioFile(call: PluginCall) {
        val uriString = call.getString("uri") ?: run {
            call.reject("URI parameter is required")
            return
        }

        val appContext = context ?: run {
            call.reject("Application context is null")
            return
        }

        try {
            val uri = Uri.parse(uriString)
            val inputStream: InputStream? = appContext.contentResolver.openInputStream(uri)

            if (inputStream == null) {
                call.reject("Unable to open stream for URI: $uriString")
                return
            }

            inputStream.use { stream ->
                val buffer = ByteArray(8192)
                val output = ByteArrayOutputStream()
                var bytesRead: Int
                while (stream.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                }
                val bytes = output.toByteArray()
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

                val result = JSObject()
                result.put("data", base64)
                result.put("size", bytes.size)
                call.resolve(result)
            }
        } catch (e: Exception) {
            call.reject("Failed to read audio file from $uriString: ${e.message}", e)
        }
    }
}
